"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EvaluationResultSchema, type EvaluationResult } from "@/lib/scoring";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import type { GameMode } from "@/lib/types/database";

interface ResultData {
  mode: GameMode;
  surname: string;
  canonicalName: string;
  answerText: string;
  totalScore: number;
  evaluation: EvaluationResult;
}

export default function ResultsPage() {
  const params = useParams();
  const id = String(params.id);
  const supabase = createClient();
  const [result, setResult] = useState<ResultData | null>(null);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let sub: { unsubscribe: () => void } | undefined;
    const embedded =
      typeof window !== "undefined" && window.self !== window.top;

    async function load(accessToken: string) {
      try {
        const res = await fetch(`/api/result/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("not ok");
        const json = await res.json();
        const evaluation = EvaluationResultSchema.parse(json.scores);
        if (!cancelled) {
          setResult({
            mode: json.mode,
            surname: json.surname,
            canonicalName: json.canonicalName,
            answerText: json.answerText,
            totalScore: Number(json.totalScore),
            evaluation,
          });
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        load(session.access_token);
        return;
      }
      if (!embedded) {
        setStatus("error");
        return;
      }
      // Embedded: wait for the PeytzGames session to be bridged in.
      const { data } = supabase.auth.onAuthStateChange((_event, next) => {
        if (next) {
          sub?.unsubscribe();
          if (timeout) clearTimeout(timeout);
          load(next.access_token);
        }
      });
      sub = data.subscription;
      timeout = setTimeout(() => {
        if (!cancelled) setStatus("error");
        sub?.unsubscribe();
      }, 6000);
    });

    return () => {
      cancelled = true;
      sub?.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [id, supabase]);

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        {status === "error" ? (
          <>
            <h1 className="text-2xl font-bold mb-3">Couldn&apos;t load result</h1>
            <p className="text-gray-400 mb-6">
              This result isn&apos;t available.
            </p>
            <Link
              href="/play?mode=historical"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Back to play
            </Link>
          </>
        ) : (
          <div className="animate-pulse text-gray-400">Loading your result…</div>
        )}
      </div>
    );
  }

  const accent =
    result.mode === "living" ? "text-emerald-400" : "text-amber-500";
  const modeLabel =
    result.mode === "living" ? "Living Legacy" : "Historical Legacy";
  const playAgainHref =
    result.mode === "living" ? "/play?mode=living" : "/play?mode=historical";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          {modeLabel}
        </p>
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">
          Results for
        </p>
        <h1 className={`text-4xl font-black ${accent}`}>{result.surname}</h1>
        <p className="text-gray-400 mt-2">
          The answer was{" "}
          <span className="text-white font-semibold">
            {result.canonicalName}
          </span>
        </p>
      </div>

      <ScoreBreakdown
        evaluation={result.evaluation}
        totalScore={result.totalScore}
      />

      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Your Answer</h3>
        <p className="text-sm text-gray-400 whitespace-pre-wrap">
          {result.answerText}
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href={playAgainHref}
          className="flex-1 text-center py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play Again
        </Link>
        <Link
          href="/leaderboard"
          className="flex-1 text-center py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
