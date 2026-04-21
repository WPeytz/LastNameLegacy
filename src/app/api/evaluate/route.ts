import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import {
  EvaluationResultSchema,
  SCORING_CATEGORIES,
  computeTotal,
} from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Surname, Game, Profile, GameMode } from "@/lib/types/database";

const RequestSchema = z.object({
  subjectId: z.string().uuid(),
  answer: z.string().min(1).max(5000),
  mode: z.enum(["historical", "living"]).default("historical"),
});

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function tableForMode(mode: GameMode) {
  return mode === "living" ? "living_people" : "surnames";
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

    const { subjectId, answer, mode } = parsed.data;
    const table = tableForMode(mode);

    // Fetch the subject from the correct table
    const { data: subject, error: subjectError } = await supabase
      .from(table)
      .select("*")
      .eq("id", subjectId)
      .single<Surname>();

    if (subjectError || !subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const categoryList = SCORING_CATEGORIES.map(
      (c) => `- ${c.key}: ${c.label} (max ${c.maxPoints} pts, weight by correctness 0/0.5/1)`
    ).join("\n");

    const modeBlurb =
      mode === "living"
        ? `This is the "Living Legacy" mode — the answer is a currently living public figure.`
        : `This is the "Historical Legacy" mode — the answer is a notable historical figure.`;

    const prompt = `You are a trivia judge for the game "Last Name Legacy". ${modeBlurb} The player was shown only the surname "${subject.surname}" and must describe the famous person associated with it.

The canonical person is: ${subject.canonical_full_name}
- Country: ${subject.country}
- Profession: ${subject.profession}
- Era: ${subject.era}

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

    const subjectColumn = mode === "living" ? "living_person_id" : "surname_id";

    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        user_id: user.id,
        mode,
        [subjectColumn]: subjectId,
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
      mode,
      evaluation,
      totalScore,
      surname: subject.surname,
      canonicalName: subject.canonical_full_name,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
