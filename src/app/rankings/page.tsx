import { createClient } from "@/lib/supabase/server";

interface SurnameRow {
  id: string;
  surname: string;
}

interface GameScoreRow {
  surname_id: string;
  total_score: number;
}

interface SurnameStats {
  surname: string;
  surnameId: string;
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

export default async function RankingsPage() {
  const supabase = await createClient();

  const { data: surnames } = await supabase
    .from("surnames")
    .select("id, surname")
    .returns<SurnameRow[]>();

  const { data: games } = await supabase
    .from("games")
    .select("surname_id, total_score")
    .returns<GameScoreRow[]>();

  if (!surnames || !games) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Failed to load rankings.</p>
      </div>
    );
  }

  // Group games by surname
  const gamesBySurname = new Map<string, number[]>();
  for (const game of games) {
    const scores = gamesBySurname.get(game.surname_id) ?? [];
    scores.push(Number(game.total_score));
    gamesBySurname.set(game.surname_id, scores);
  }

  const stats: SurnameStats[] = surnames
    .map((s) => {
      const scores = gamesBySurname.get(s.id) ?? [];
      if (scores.length === 0) {
        return {
          surname: s.surname,
          surnameId: s.id,
          attempts: 0,
          avgScore: 0,
          topScore: 0,
          medianScore: 0,
        };
      }
      return {
        surname: s.surname,
        surnameId: s.id,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Last Name Rankings</h1>
        <p className="text-gray-400 mt-2">
          Surnames ranked by average player score
        </p>
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
                key={s.surnameId}
                className="border-b border-gray-700/50 hover:bg-gray-800/80 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-amber-500">{s.surname}</td>
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
