import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import {
  EvaluationResultSchema,
  SCORING_CATEGORIES,
  computeTotal,
} from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Surname, Game, Profile } from "@/lib/types/database";

const RequestSchema = z.object({
  surnameId: z.string().uuid(),
  answer: z.string().min(1).max(5000),
});

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { surnameId, answer } = parsed.data;

    // Fetch the surname
    const { data: surname, error: surnameError } = await supabase
      .from("surnames")
      .select("*")
      .eq("id", surnameId)
      .single<Surname>();

    if (surnameError || !surname) {
      return NextResponse.json({ error: "Surname not found" }, { status: 404 });
    }

    // Build the evaluation prompt
    const categoryList = SCORING_CATEGORIES.map(
      (c) => `- ${c.key}: ${c.label} (max ${c.maxPoints} pts, weight by correctness 0/0.5/1)`
    ).join("\n");

    const prompt = `You are a trivia judge for the game "Last Name Legacy". The player was shown only the surname "${surname.surname}" and must describe the famous person associated with it.

The canonical person is: ${surname.canonical_full_name}
- Country: ${surname.country}
- Profession: ${surname.profession}
- Era: ${surname.era}

The player wrote:
"${answer}"

Score the player's answer across these categories. For each, give a correctness score of exactly 0, 0.5, or 1:
- 0 = wrong or not mentioned
- 0.5 = partially correct or vague
- 1 = correct

Categories:
${categoryList}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation outside the JSON):
{
  "first_name": { "score": 0, "reasoning": "..." },
  "country": { "score": 0, "reasoning": "..." },
  "profession": { "score": 0, "reasoning": "..." },
  "creative_works": { "score": 0, "reasoning": "..." },
  "accomplishments": { "score": 0, "reasoning": "..." },
  "famous_associates": { "score": 0, "reasoning": "..." },
  "era": { "score": 0, "reasoning": "..." },
  "extra_facts": { "score": 0, "reasoning": "..." }
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "AI evaluation failed" },
        { status: 500 }
      );
    }

    const rawJson = JSON.parse(rawContent);
    const evaluation = EvaluationResultSchema.parse(rawJson);
    const totalScore = computeTotal(evaluation);

    // Save the game
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        user_id: user.id,
        surname_id: surnameId,
        answer_text: answer,
        total_score: totalScore,
        scores: evaluation,
      } as Record<string, unknown>)
      .select()
      .single<Game>();

    if (gameError || !game) {
      console.error("Failed to save game:", gameError);
      return NextResponse.json(
        { error: "Failed to save game" },
        { status: 500 }
      );
    }

    // Update profile stats
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_games, total_score")
      .eq("id", user.id)
      .single<Pick<Profile, "total_games" | "total_score">>();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          total_games: profile.total_games + 1,
          total_score: Number(profile.total_score) + totalScore,
        } as Record<string, unknown>)
        .eq("id", user.id);
    }

    return NextResponse.json({
      gameId: game.id,
      evaluation,
      totalScore,
      surname: surname.surname,
      canonicalName: surname.canonical_full_name,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
