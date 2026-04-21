export type GameMode = "historical" | "living";

export const GAME_MODES: readonly GameMode[] = ["historical", "living"] as const;

export function isGameMode(value: unknown): value is GameMode {
  return value === "historical" || value === "living";
}

export interface Surname {
  id: string;
  surname: string;
  canonical_first_name: string;
  canonical_full_name: string;
  country: string;
  profession: string;
  era: string;
  hint: string | null;
  created_at: string;
}

export type LivingPerson = Surname;

export interface Game {
  id: string;
  user_id: string;
  mode: GameMode;
  surname_id: string | null;
  living_person_id: string | null;
  answer_text: string;
  total_score: number;
  scores: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  total_games: number;
  total_score: number;
  created_at: string;
}
