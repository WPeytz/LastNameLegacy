import { createBrowserClient } from "@supabase/ssr";

// Single shared browser client. Every caller (SessionBridge, the play page,
// Navbar, …) must share one instance so they share one in-memory auth session.
// This matters in the cross-site PeytzGames iframe: browsers block/partition
// third-party cookie storage, so a session bridged in by SessionBridge only
// survives in memory — a second `createBrowserClient()` instance would see no
// session and wrongly show "Sign in to Play".
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
  );
}

let browserClient: ReturnType<typeof makeClient> | undefined;

export function createClient() {
  browserClient ??= makeClient();
  return browserClient;
}
