import { z } from "zod";

export const SCORING_CATEGORIES = [
  { key: "first_name", label: "First Name", maxPoints: 2 },
  { key: "country", label: "Country", maxPoints: 1.5 },
  { key: "profession", label: "Profession", maxPoints: 1.5 },
  { key: "creative_works", label: "Creative Works / Key Contributions", maxPoints: 2 },
  { key: "accomplishments", label: "Accomplishments", maxPoints: 2 },
  { key: "famous_associates", label: "Famous Associates", maxPoints: 1 },
  { key: "era", label: "Era / Time Period", maxPoints: 1 },
  { key: "extra_facts", label: "Extra Facts", maxPoints: 2 },
] as const;

export type CategoryKey = (typeof SCORING_CATEGORIES)[number]["key"];

export const MAX_TOTAL = SCORING_CATEGORIES.reduce((sum, c) => sum + c.maxPoints, 0); // 13

export const CategoryScoreSchema = z.object({
  score: z.number().transform((val) => {
    // Clamp to 0, 0.5, or 1 — the AI sometimes returns other values
    if (val <= 0.25) return 0;
    if (val <= 0.75) return 0.5;
    return 1;
  }),
  reasoning: z.string(),
});

export const EvaluationResultSchema = z.object({
  first_name: CategoryScoreSchema,
  country: CategoryScoreSchema,
  profession: CategoryScoreSchema,
  creative_works: CategoryScoreSchema,
  accomplishments: CategoryScoreSchema,
  famous_associates: CategoryScoreSchema,
  era: CategoryScoreSchema,
  extra_facts: CategoryScoreSchema,
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export function computeTotal(evaluation: EvaluationResult): number {
  let total = 0;
  for (const category of SCORING_CATEGORIES) {
    total += evaluation[category.key].score * category.maxPoints;
  }
  return Math.round(total * 100) / 100;
}
