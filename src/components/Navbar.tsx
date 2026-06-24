"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Whether we're rendered inside an iframe (the PeytzGames embed). Read via
// useSyncExternalStore so the server snapshot is always `false` and the client
// reads the real value without a setState-in-effect.
const subscribe = () => () => {};
function useIsEmbedded() {
  return useSyncExternalStore(
    subscribe,
    () => window.self !== window.top,
    () => false,
  );
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  // When embedded in PeytzGames, auth is controlled by the host (single
  // sign-on via SessionBridge), so we hide our own Sign In / Sign Out.
  const embedded = useIsEmbedded();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-amber-500 hover:text-amber-400 transition-colors">
          Last Name Legacy
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/play?mode=historical" className="text-sm text-gray-300 hover:text-white transition-colors">
            Historical
          </Link>
          <Link href="/play?mode=living" className="text-sm text-gray-300 hover:text-white transition-colors">
            Living
          </Link>
          <Link href="/leaderboard" className="text-sm text-gray-300 hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link href="/rankings" className="text-sm text-gray-300 hover:text-white transition-colors">
            Rankings
          </Link>

          {user ? (
            <>
              <Link href="/settings" className="text-sm text-gray-300 hover:text-white transition-colors">
                Settings
              </Link>
              {!embedded && (
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              )}
            </>
          ) : (
            // Logged out: only offer Sign In on the standalone site. Inside the
            // PeytzGames embed the host bridges the session in for us.
            !embedded && (
              <Link
                href="/auth/login"
                className="text-sm bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
