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

export interface Game {
  id: string;
  user_id: string;
  surname_id: string;
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
