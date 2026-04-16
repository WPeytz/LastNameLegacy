import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EvaluationResultSchema } from "@/lib/scoring";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import Link from "next/link";

interface GameWithSurname {
  id: string;
  answer_text: string;
  total_score: number;
  scores: Record<string, unknown>;
  surnames: {
    surname: string;
    canonical_full_name: string;
  };
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("id, answer_text, total_score, scores, surnames(surname, canonical_full_name)")
    .eq("id", id)
    .single<GameWithSurname>();

  if (error || !game) {
    notFound();
  }

  const evaluation = EvaluationResultSchema.parse(game.scores);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">
          Results for
        </p>
        <h1 className="text-4xl font-black text-amber-500">
          {game.surnames.surname}
        </h1>
        <p className="text-gray-400 mt-2">
          The answer was <span className="text-white font-semibold">{game.surnames.canonical_full_name}</span>
        </p>
      </div>

      <ScoreBreakdown evaluation={evaluation} totalScore={Number(game.total_score)} />

      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Your Answer</h3>
        <p className="text-sm text-gray-400 whitespace-pre-wrap">{game.answer_text}</p>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href="/play"
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
