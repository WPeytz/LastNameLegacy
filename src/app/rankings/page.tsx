import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isGameMode, type GameMode } from "@/lib/types/database";

interface SubjectRow {
  id: string;
  surname: string;
}

interface GameScoreRow {
  surname_id: string | null;
  living_person_id: string | null;
  total_score: number;
}

interface SubjectStats {
  surname: string;
  subjectId: string;
  attempts: number;
  avgScore: number;
  topScore: number;
  medianScore: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

interface Props {
  searchParams: Promise<{ mode?: string }>;
}

export default async function RankingsPage({ searchParams }: Props) {
  const { mode: modeParam } = await searchParams;
  const mode: GameMode = isGameMode(modeParam) ? modeParam : "historical";
  const table = mode === "living" ? "living_people" : "surnames";
  const subjectColumn = mode === "living" ? "living_person_id" : "surname_id";
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from(table)
    .select("id, surname")
    .returns<SubjectRow[]>();

  const { data: games } = await supabase
    .from("games")
    .select("surname_id, living_person_id, total_score")
    .eq("mode", mode)
    .returns<GameScoreRow[]>();

  if (!subjects || !games) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Failed to load rankings.</p>
      </div>
    );
  }

  const gamesBySubject = new Map<string, number[]>();
  for (const game of games) {
    const id = subjectColumn === "living_person_id" ? game.living_person_id : game.surname_id;
    if (!id) continue;
    const scores = gamesBySubject.get(id) ?? [];
    scores.push(Number(game.total_score));
    gamesBySubject.set(id, scores);
  }

  const stats: SubjectStats[] = subjects
    .map((s) => {
      const scores = gamesBySubject.get(s.id) ?? [];
      if (scores.length === 0) {
        return {
          surname: s.surname,
          subjectId: s.id,
          attempts: 0,
          avgScore: 0,
          topScore: 0,
          medianScore: 0,
        };
      }
      return {
        surname: s.surname,
        subjectId: s.id,
        attempts: scores.length,
        avgScore:
          Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
          ) / 100,
        topScore: Math.max(...scores),
        medianScore: median(scores),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const heading = mode === "living" ? "Living Legacy Rankings" : "Historical Legacy Rankings";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">{heading}</h1>
        <p className="text-gray-400 mt-2">
          Surnames ranked by average player score
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-8 text-sm">
        <Link
          href="/rankings?mode=historical"
          className={`px-4 py-1.5 rounded-full border transition-colors ${
            mode === "historical"
              ? "border-amber-500 text-amber-400"
              : "border-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          Historical
        </Link>
        <Link
          href="/rankings?mode=living"
          className={`px-4 py-1.5 rounded-full border transition-colors ${
            mode === "living"
              ? "border-emerald-500 text-emerald-400"
              : "border-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          Living
        </Link>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Surname</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Avg Score</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Top Score</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Median</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr
                key={s.subjectId}
                className="border-b border-gray-700/50 hover:bg-gray-800/80 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                <td className={`px-4 py-3 font-semibold ${mode === "living" ? "text-emerald-400" : "text-amber-500"}`}>{s.surname}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {s.attempts > 0 ? s.avgScore : "\u2014"}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {s.attempts > 0 ? s.topScore : "\u2014"}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {s.attempts > 0 ? s.medianScore : "\u2014"}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{s.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
