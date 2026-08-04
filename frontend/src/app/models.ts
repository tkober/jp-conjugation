export interface Profile {
  elo: number;
  level: number;
  level_progress: number;
  current_streak: number;
  best_streak: number;
}

export interface Exercise extends Profile {
  practice_item_id: number;
  word_id: number;
  form_key: string;
  form_title: string;
  word_type: string;
  trigger: string;
  kanji: string;
  hiragana: string;
  english: string;
  jlpt: string;
  target_time_ms: number;
}

export interface Transformation {
  unaltered: string;
  altered_part: string;
  alteration: string;
  operation: string;
}

export interface AnswerResult {
  correct: boolean;
  stem_correct: boolean;
  ending_correct: boolean;
  fast: boolean;
  target_time_ms: number;
  stem: string;
  ending: string;
  given: string;
  expected_kanji: string;
  expected_hiragana: string;
  transformations: Transformation[];
  elo: { before: number; after: number; delta: number };
  user_level: number;
  level_progress: number;
  streak: number;
  best_streak: number;
}

export interface AnswerRequest {
  practice_item_id: number;
  word_id: number;
  answer: string;
  time_ms: number;
}
