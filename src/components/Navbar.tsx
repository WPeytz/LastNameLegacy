"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
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
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
