import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

// Single shared browser client. Every caller (SessionBridge, the play page,
// Navbar, …) must share one instance so they share one in-memory auth session.
//
// Cookie storage alone does not survive the cross-site PeytzGames iframe:
// browsers silently drop third-party cookie writes there, so a session
// bridged in by SessionBridge would vanish on the very next
// auth.getSession() (which re-reads storage, not memory) — API calls then
// go out without a Bearer token and 401. To fix that, auth storage is a
// layered overlay:
//
//   memory  >  localStorage  >  document.cookie
//
// - document.cookie keeps working for first-party visits (the standalone
//   site), where the server also reads the session from cookies.
// - localStorage (partitioned but writable in iframes) lets the bridged —
//   and any refreshed — session survive full page loads inside the embed.
// - memory guarantees reads within a page lifetime even where both writes
//   are blocked (e.g. Safari private mode).
const LS_PREFIX = "sb-cookie:";

function lsGetAll(): { name: string; value: string }[] {
  try {
    const out: { name: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value !== null) out.push({ name: key.slice(LS_PREFIX.length), value });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function lsSet(name: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(LS_PREFIX + name);
    else localStorage.setItem(LS_PREFIX + name, value);
  } catch {
    // Storage unavailable — the in-memory layer still covers this page.
  }
}

function makeClient() {
  const memory = new Map<string, string>();
  const deleted = new Set<string>();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          // Later layers override earlier ones; deletions mask all layers.
          const merged = new Map<string, string>();
          const cookieHeader = typeof document === "undefined" ? "" : document.cookie;
          for (const { name, value } of parseCookieHeader(cookieHeader)) {
            if (value !== undefined) merged.set(name, value);
          }
          for (const { name, value } of lsGetAll()) merged.set(name, value);
          for (const [name, value] of memory) merged.set(name, value);
          for (const name of deleted) merged.delete(name);
          return [...merged.entries()].map(([name, value]) => ({ name, value }));
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            const isRemoval = value === "" || options?.maxAge === 0;
            if (isRemoval) {
              memory.delete(name);
              deleted.add(name);
              lsSet(name, null);
            } else {
              memory.set(name, value);
              deleted.delete(name);
              lsSet(name, value);
            }
            if (typeof document !== "undefined") {
              document.cookie = serializeCookieHeader(name, value, options);
            }
          }
        },
      },
    }
  );
}

let browserClient: ReturnType<typeof makeClient> | undefined;

export function createClient() {
  browserClient ??= makeClient();
  return browserClient;
}
