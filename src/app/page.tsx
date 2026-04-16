import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
          Last Name
          <span className="text-amber-500"> Legacy</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-lg mx-auto">
          You see a famous last name. Write everything you know about them. AI scores your knowledge across 8 categories.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/play"
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white text-lg font-semibold rounded-xl transition-colors shadow-lg shadow-amber-600/20"
          >
            Start Playing
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-semibold rounded-xl transition-colors border border-gray-700"
          >
            View Leaderboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-amber-500 mb-2">See a Last Name</h3>
            <p className="text-sm text-gray-400">
              You&apos;re shown a famous surname like &quot;Einstein&quot; or &quot;Curie&quot;. No other clues.
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
