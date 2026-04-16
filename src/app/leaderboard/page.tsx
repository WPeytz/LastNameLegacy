import { createClient } from "@/lib/supabase/server";

interface ProfileRow {
  id: string;
  display_name: string;
  total_games: number;
  total_score: number;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, total_games, total_score")
    .gt("total_games", 0)
    .order("total_score", { ascending: false })
    .limit(50)
    .returns<ProfileRow[]>();

  const players = (profiles ?? [])
    .map((p) => ({
      ...p,
      avgScore:
        p.total_games > 0
          ? Math.round((Number(p.total_score) / p.total_games) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Player Leaderboard</h1>
        <p className="text-gray-400 mt-2">Top players ranked by average score per game</p>
      </div>

      {players.length === 0 ? (
        <p className="text-center text-gray-500">No games played yet. Be the first!</p>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Player</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Avg Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Games</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="border-b border-gray-700/50 hover:bg-gray-800/80 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">
                    {i === 0 ? (
                      <span className="text-amber-400 font-bold">1st</span>
                    ) : i === 1 ? (
                      <span className="text-gray-300 font-bold">2nd</span>
                    ) : i === 2 ? (
                      <span className="text-orange-400 font-bold">3rd</span>
                    ) : (
                      <span className="text-gray-500">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{player.display_name}</td>
                  <td className="px-4 py-3 text-right text-amber-500 font-semibold">
                    {player.avgScore}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{player.total_games}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {Number(player.total_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
