import { NextRequest, NextResponse } from "next/server";
import { createClient, bearerToken } from "@/lib/supabase/server";
import type { GameMode } from "@/lib/types/database";

interface GameRow {
  id: string;
  mode: GameMode;
  surname_id: string | null;
  living_person_id: string | null;
  answer_text: string;
  total_score: number;
  scores: Record<string, unknown>;
}

interface SubjectRow {
  surname: string;
  canonical_full_name: string;
}

// Result data for a finished game. Authenticates via Bearer token (or cookies
// when standalone) so it works inside the PeytzGames cross-site embed, where
// third-party cookies aren't available and a full-page navigation to the
// results route can't carry auth.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const token = bearerToken(request);
  const supabase = await createClient(token);

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: game, error } = await supabase
    .from("games")
    .select(
      "id, mode, surname_id, living_person_id, answer_text, total_score, scores",
    )
    .eq("id", id)
    .single<GameRow>();

  if (error || !game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mode: GameMode = game.mode ?? "historical";
  const subjectTable = mode === "living" ? "living_people" : "surnames";
  const subjectId = mode === "living" ? game.living_person_id : game.surname_id;

  if (!subjectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: subject } = await supabase
    .from(subjectTable)
    .select("surname, canonical_full_name")
    .eq("id", subjectId)
    .single<SubjectRow>();

  if (!subject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    mode,
    surname: subject.surname,
    canonicalName: subject.canonical_full_name,
    answerText: game.answer_text,
    totalScore: Number(game.total_score),
    scores: game.scores,
  });
}
