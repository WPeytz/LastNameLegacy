"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Single sign-on with PeytzGames. When this app is embedded in the PeytzGames
// play page, the host posts its Supabase session (the SAME Supabase project)
// into the iframe so the player never has to log in a second time here.
//
// Messages are accepted only from the PeytzGames origin, since they carry
// auth tokens.
const HOST_ORIGIN = "https://peytzgames.com";

export default function SessionBridge() {
  const router = useRouter();

  useEffect(() => {
    // Only bridge when actually embedded.
    if (window.self === window.top) return;
    const supabase = createClient();

    async function applySession(accessToken: string, refreshToken: string) {
      const { data } = await supabase.auth.getSession();
      // Already on this session — don't re-set and loop on router.refresh().
      if (data.session?.access_token === accessToken) return;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) router.refresh();
    }

    async function clearSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      await supabase.auth.signOut();
      router.refresh();
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== HOST_ORIGIN) return;
      const msg = event.data;
      if (
        msg?.type === "peytz:session" &&
        typeof msg.access_token === "string" &&
        typeof msg.refresh_token === "string"
      ) {
        applySession(msg.access_token, msg.refresh_token);
      } else if (msg?.type === "peytz:signout") {
        clearSession();
      }
    }

    window.addEventListener("message", onMessage);
    // Ask the host for the session in case it loaded before we were ready.
    window.parent.postMessage({ type: "peytz:session:request" }, HOST_ORIGIN);

    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
