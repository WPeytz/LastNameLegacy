import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// `accessToken` lets API routes authenticate via an Authorization: Bearer
// header instead of cookies. This is required for the PeytzGames embed: the
// game runs in a cross-site iframe where browsers (Safari especially) block
// third-party cookies, so the bridged session can't be stored in cookies and
// must be passed explicitly. When set, the token is used both to validate the
// user and (via the global header) to run RLS queries as that user.
export async function createClient(accessToken?: string) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
      ...(accessToken
        ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        : {}),
    }
  );
}

/** Extract a Bearer token from a request's Authorization header, if present. */
export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}
