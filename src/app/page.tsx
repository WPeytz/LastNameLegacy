import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
          Last Name
          <span className="text-amber-500"> Legacy</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-lg mx-auto">
          You see a famous last name. Write everything you know about them. AI scores your knowledge across 8 categories.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Link
            href="/play?mode=historical"
            className="group block bg-gray-900/60 hover:bg-gray-900 border border-gray-800 hover:border-amber-500/60 rounded-xl p-6 text-left transition-colors"
          >
            <p className="text-xs text-amber-500 uppercase tracking-wide mb-2">Mode 1</p>
            <h2 className="text-2xl font-bold mb-2">Historical Legacy</h2>
            <p className="text-sm text-gray-400 mb-4">
              Einstein, Curie, Shakespeare — the greats from across history.
            </p>
            <span className="inline-block text-sm text-amber-400 group-hover:text-amber-300 font-semibold">
              Play historical →
            </span>
          </Link>

          <Link
            href="/play?mode=living"
            className="group block bg-gray-900/60 hover:bg-gray-900 border border-gray-800 hover:border-emerald-500/60 rounded-xl p-6 text-left transition-colors"
          >
            <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Mode 2</p>
            <h2 className="text-2xl font-bold mb-2">Living Legacy</h2>
            <p className="text-sm text-gray-400 mb-4">
              Musk, Beyoncé, Messi — icons shaping the world today.
            </p>
            <span className="inline-block text-sm text-emerald-400 group-hover:text-emerald-300 font-semibold">
              Play living →
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/leaderboard"
            className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
          >
            View Leaderboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-amber-500 mb-2">See a Last Name</h3>
            <p className="text-sm text-gray-400">
              You&apos;re shown a famous surname like &quot;Einstein&quot; or &quot;Musk&quot;. No other clues.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-amber-500 mb-2">Write What You Know</h3>
            <p className="text-sm text-gray-400">
              Their first name, country, profession, works, accomplishments — everything counts.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-amber-500 mb-2">Get Scored by AI</h3>
            <p className="text-sm text-gray-400">
              Your answer is evaluated across 8 categories. See exactly what you got right and wrong.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
