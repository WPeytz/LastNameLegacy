"use client";

import { SCORING_CATEGORIES, type EvaluationResult } from "@/lib/scoring";

interface ScoreBreakdownProps {
  evaluation: EvaluationResult;
  totalScore: number;
}

function ScoreBadge({ score }: { score: number }) {
  const bg =
    score === 1
      ? "bg-green-600"
      : score === 0.5
        ? "bg-amber-600"
        : "bg-gray-600";

  return (
    <span className={`${bg} text-white text-xs font-bold px-2 py-0.5 rounded`}>
      {score === 1 ? "Full" : score === 0.5 ? "Partial" : "Miss"}
    </span>
  );
}

export default function ScoreBreakdown({
  evaluation,
  totalScore,
}: ScoreBreakdownProps) {
  const maxTotal = SCORING_CATEGORIES.reduce((s, c) => s + c.maxPoints, 0);
  const pct = Math.round((totalScore / maxTotal) * 100);

  return (
    <div className="space-y-4">
      {/* Total score header */}
      <div className="text-center p-6 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="text-5xl font-bold text-amber-500">{totalScore}</div>
        <div className="text-gray-400 mt-1">
          out of {maxTotal} points ({pct}%)
        </div>
        <div className="mt-3 w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-amber-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Per-category breakdown */}
      <div className="space-y-3">
        {SCORING_CATEGORIES.map((cat) => {
          const result = evaluation[cat.key];
          const earned = result.score * cat.maxPoints;
          return (
            <div
              key={cat.key}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{cat.label}</span>
                  <ScoreBadge score={result.score} />
                </div>
                <span className="text-sm text-gray-400">
                  {earned} / {cat.maxPoints}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{result.reasoning}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
