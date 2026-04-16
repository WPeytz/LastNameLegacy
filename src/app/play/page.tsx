"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectCoverage } from "@/lib/coverage";

const TIMER_SECONDS = 90;

interface SurnameData {
  id: string;
  surname: string;
  hint: string | null;
}

export default function PlayPage() {
  const [surname, setSurname] = useState<SurnameData | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      fetchSurname();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSurname() {
    setLoading(true);
    setError("");
    stopTimer();
    try {
      const res = await fetch("/api/game");
      if (!res.ok) throw new Error("Failed to load surname");
      const data = await res.json();
      setSurname(data);
      startTimer();
    } catch {
      setError("Failed to load a surname. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && surname && !submitting && answer.trim()) {
      formRef.current?.requestSubmit();
    }
  }, [timeLeft, surname, submitting, answer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!surname || !answer.trim()) return;

    stopTimer();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surnameId: surname.id, answer: answer.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Evaluation failed");
      }

      const data = await res.json();
      router.push(`/results/${data.gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (authed === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Sign in to Play</h1>
        <p className="text-gray-400 mb-6">You need an account to play and track your scores.</p>
        <a
          href="/auth/login"
          className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-gray-400">Loading your challenge...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {surname && (
        <>
          <div className="text-center mb-10">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-2">
              Who is this person?
            </p>
            <h1 className="text-6xl font-black text-amber-500 tracking-tight">
              {surname.surname}
            </h1>
            {surname.hint && (
              <p className="text-gray-500 text-sm mt-3">
                Hint: {surname.hint}
              </p>
            )}

            {/* Timer */}
            <div className="mt-6">
              <div className={`text-3xl font-mono font-bold tabular-nums ${timeLeft <= 10 ? "text-red-500" : timeLeft <= 30 ? "text-amber-400" : "text-white"}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
              <div className="mt-2 w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? "bg-red-500" : timeLeft <= 30 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-300 mb-2">
                Write everything you know about this person
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={8}
                maxLength={5000}
                required
                placeholder="Their first name, country, profession, famous works, accomplishments, associates, time period, fun facts..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-gray-500 resize-none"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {answer.length} / 5000
              </div>

              {/* Live coverage tracker */}
              <CoverageTracker answer={answer} />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {submitting ? "Evaluating..." : "Submit Answer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopTimer();
                  setAnswer("");
                  fetchSurname();
                }}
                disabled={submitting}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                Skip
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function CoverageTracker({ answer }: { answer: string }) {
  const { covered, missing } = useMemo(() => detectCoverage(answer), [answer]);

  if (!answer.trim()) return null;

  return (
    <div className="mt-3 space-y-2 text-sm">
      {covered.length > 0 && (
        <p className="text-green-400">
          <span className="font-medium">Likely covered:</span>{" "}
          {covered.join(", ")}
        </p>
      )}
      {missing.length > 0 && (
        <p className="text-amber-400">
          <span className="font-medium">Missing:</span>{" "}
          {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
