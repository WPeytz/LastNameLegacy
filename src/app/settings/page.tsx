"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setUsername(profile?.username ?? "");
      setLoadingUser(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimmed = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(trimmed)) {
      setNameMessage({
        type: "err",
        text: "Username must be 3-20 characters: letters, numbers, or underscores.",
      });
      return;
    }

    setSavingName(true);
    setNameMessage(null);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", user.id);

    if (profileError) {
      setSavingName(false);
      setNameMessage({
        type: "err",
        text: profileError.message.includes("duplicate")
          ? "That username is already taken."
          : profileError.message,
      });
      return;
    }

    await supabase.auth.updateUser({ data: { username: trimmed } });

    setSavingName(false);
    setNameMessage({ type: "ok", text: "Username updated." });
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");

    const { error } = await supabase.rpc("delete_user");

    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-400 mt-2">Manage your account</p>
        </div>

        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Username</h2>
          <p className="text-sm text-gray-400 mb-3">
            Shared with your PeytzGames account.
          </p>
          <form onSubmit={handleSaveName} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="3-20 characters: letters, numbers, or underscores"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
              placeholder="Your username"
            />

            {nameMessage && (
              <div
                className={
                  nameMessage.type === "ok"
                    ? "bg-emerald-900/40 border border-emerald-700 text-emerald-200 px-4 py-2 rounded-lg text-sm"
                    : "bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm"
                }
              >
                {nameMessage.text}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingName}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {savingName ? "Saving…" : "Save"}
              </button>
              <Link href="/" className="text-sm text-gray-400 hover:text-white">
                Cancel
              </Link>
            </div>
          </form>
        </section>

        <section className="bg-gray-900/60 border border-red-900/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Delete account</h2>
          <p className="text-sm text-gray-400 mb-4">
            This permanently deletes your shared PeytzGames account, including your profile, game
            history, and arcade scores on peytzgames.com. This cannot be undone.
          </p>

          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                Type <span className="font-mono text-red-300">DELETE</span> to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                placeholder="DELETE"
              />
              {deleteError && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {deleteError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmText("");
                    setDeleteError("");
                  }}
                  disabled={deleting}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
