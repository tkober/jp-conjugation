export interface Profile {
  elo: number;
  level: number;
  level_progress: number;
  current_streak: number;
  best_streak: number;
}

export type InstructionDimension = 'category' | 'tense' | 'politeness' | 'polarity';
export type InstructionStyle = 'text' | 'emoji' | 'both';

export interface InstructionPart {
  dimension: InstructionDimension;
  value: string;
  label: string;
  /** `null` for the category: grammar stays text in every style. */
  emoji: string | null;
  marked: boolean;
}

export interface InstructionDimensionInfo {
  dimension: InstructionDimension;
  label: string;
  values: { value: string; label: string; emoji: string | null }[];
}

export interface Exercise extends Profile {
  practice_item_id: number;
  word_id: number;
  form_key: string;
  form_title: string;
  instruction: InstructionPart[];
  instruction_style: InstructionStyle;
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
  /** Alt+H — the learner gave up; the backend ignores `answer` and scores it
   *  as a plain miss. */
  gave_up?: boolean;
}

export interface FormOption {
  form_key: string;
  title: string;
  settings_title: string;
}

export interface FormGroup {
  category: string;
  title: string;
  forms: FormOption[];
}

export interface Settings {
  groups: FormGroup[];
  jlpt_levels: string[];
  disabled_forms: string[];
  disabled_jlpt: string[];
  time_base_ms: number;
  time_per_kana_ms: number;
  instruction_style: InstructionStyle;
  instruction_order: InstructionDimension[];
  instruction_styles: InstructionStyle[];
  instruction_dimensions: InstructionDimensionInfo[];
  instruction_examples: InstructionPart[][];
  defaults: {
    time_base_ms: number;
    time_per_kana_ms: number;
    instruction_style: InstructionStyle;
    instruction_order: InstructionDimension[];
  };
  limits: { time_base_ms: [number, number]; time_per_kana_ms: [number, number] };
  examples: { kana: number; budget_ms: number }[];
}

export interface SettingsUpdate {
  disabled_forms?: string[];
  disabled_jlpt?: string[];
  time_base_ms?: number;
  time_per_kana_ms?: number;
  instruction_style?: InstructionStyle;
  instruction_order?: InstructionDimension[];
}

export interface ItemStat {
  id: number;
  form_key: string;
  title: string;
  word_type: string;
  trigger: string;
  rating: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  last_served_at: string | null;
}

export interface RecentAttempt {
  created_at: string;
  kanji: string;
  form_key: string;
  title: string;
  given: string;
  expected: string;
  correct: boolean;
  stem_correct: boolean;
  ending_correct: boolean;
  time_ms: number;
  elo_delta: number;
}

export interface Stats extends Profile {
  attempts: number;
  correct: number;
  accuracy: number | null;
  avg_time_ms: number | null;
  missed_with_right_rule: number;
  missed_with_right_reading: number;
  elo_history: number[];
  items: ItemStat[];
  weakest_items: ItemStat[];
  recent: RecentAttempt[];
}

export interface WordRow {
  id: number;
  kanji: string;
  hiragana: string;
  english: string;
  jlpt: string;
  word_type: string;
  trigger: string;
  rating: number;
  attempts: number;
  correct: number;
}

export interface WordsResponse {
  total: number;
  limit: number;
  offset: number;
  words: WordRow[];
}

export interface RuleRow {
  word_type: string;
  trigger: string;
  /** One of the engine's special cases (行く, 呉れる, 良い) — only listed where
   *  it actually breaks the regular rule. */
  exception: boolean;
  /** The kana the rule replaces; '' means "append" (and with an empty
   *  replacement too, "unchanged"). */
  ending: string;
  replacement: string;
  example: {
    kanji: string;
    hiragana: string;
    english: string;
    result_kanji: string;
    result_hiragana: string;
  };
  transformations: Transformation[];
}

export interface RuleForm extends FormOption {
  rules: RuleRow[];
}

export interface RuleGroup {
  category: string;
  title: string;
  summary: string;
  build: string;
  forms: RuleForm[];
}

export interface RulesResponse {
  groups: RuleGroup[];
}
