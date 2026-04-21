import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EvaluationResultSchema } from "@/lib/scoring";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import Link from "next/link";
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("id, mode, surname_id, living_person_id, answer_text, total_score, scores")
    .eq("id", id)
    .single<GameRow>();

  if (error || !game) {
    notFound();
  }

  const mode: GameMode = game.mode ?? "historical";
  const subjectTable = mode === "living" ? "living_people" : "surnames";
  const subjectId = mode === "living" ? game.living_person_id : game.surname_id;

  if (!subjectId) {
    notFound();
  }

  const { data: subject } = await supabase
    .from(subjectTable)
    .select("surname, canonical_full_name")
    .eq("id", subjectId)
    .single<SubjectRow>();

  if (!subject) {
    notFound();
  }

  const evaluation = EvaluationResultSchema.parse(game.scores);
  const accent = mode === "living" ? "text-emerald-400" : "text-amber-500";
  const modeLabel = mode === "living" ? "Living Legacy" : "Historical Legacy";
  const playAgainHref = mode === "living" ? "/play?mode=living" : "/play?mode=historical";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{modeLabel}</p>
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">
          Results for
        </p>
        <h1 className={`text-4xl font-black ${accent}`}>
          {subject.surname}
        </h1>
        <p className="text-gray-400 mt-2">
          The answer was <span className="text-white font-semibold">{subject.canonical_full_name}</span>
        </p>
      </div>

      <ScoreBreakdown evaluation={evaluation} totalScore={Number(game.total_score)} />

      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Your Answer</h3>
        <p className="text-sm text-gray-400 whitespace-pre-wrap">{game.answer_text}</p>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href={playAgainHref}
          className="flex-1 text-center py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play Again
        </Link>
        <Link
          href="/leaderboard"
          className="flex-1 text-center py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
