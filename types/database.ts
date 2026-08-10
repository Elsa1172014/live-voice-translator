import { z } from 'zod';

// ---- Domain types used by the coach's context builder ----
export interface SessionPlan {
  conversationGoal: string;
  languageGoal: string;
  targetExpressions: string[];
  watchErrors: string[];
  difficultyLevel: string;
}

export interface SessionMemory {
  stableLevel: string | null;
  recentSessionSummaries: string[];
  topRecurringErrors: Array<{ original: string; corrected: string; type: string }>;
  vocabularyDueForReview: Array<{ term: string }>;
  prioritySkill: string | null;
}

// ---- Zod validation for forms / API boundaries ----
export const TopicSchema = z.enum([
  'daily_life',
  'family_relationships',
  'education',
  'school_leadership',
  'teaching_and_learning',
  'assessment_and_progress',
  'artificial_intelligence',
  'technology',
  'travel',
  'social_situations',
  'job_interviews',
  'khda_professional_interview',
  'ielts_speaking',
  'sports',
  'films_and_books',
  'news_and_current_issues',
  'debate_and_critical_thinking',
  'custom',
]);
export type Topic = z.infer<typeof TopicSchema>;

export const StartSessionSchema = z.object({
  topic: TopicSchema,
  topicCustomText: z.string().max(300).optional(),
});

export const UserPreferencesSchema = z.object({
  english_variant: z.enum(['british', 'american']),
  coach_voice: z.string(),
  speech_speed: z.enum(['slow', 'normal', 'fast']),
  correction_strictness: z.enum(['light', 'balanced', 'strict']),
  caption_visibility: z.enum(['hidden', 'on_correction', 'always']),
  images_enabled: z.boolean(),
  silence_timeout_ms: z.number().min(400).max(4000),
  interruption_sensitivity: z.enum(['low', 'medium', 'high']),
  question_difficulty: z.enum(['easier', 'adaptive', 'harder']),
  arabic_allowed: z.boolean(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const VocabularyItemSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  item_type: z.enum(['word', 'chunk', 'collocation', 'phrasal_verb', 'linking_phrase']),
  meaning_en: z.string().nullable(),
  status: z.enum(['new', 'learning', 'practising', 'mastered']),
  next_review_at: z.string(),
});
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

export const LanguageErrorSchema = z.object({
  id: z.string().uuid(),
  error_type: z.enum([
    'grammar', 'tense', 'sentence_structure', 'preposition', 'word_choice',
    'pronunciation', 'stress', 'fluency', 'unnatural_expression', 'coherence',
  ]),
  original_text: z.string(),
  corrected_text: z.string(),
  status: z.enum(['observed', 'recurring', 'practising', 'improving', 'mastered']),
  occurrence_count: z.number(),
});
export type LanguageError = z.infer<typeof LanguageErrorSchema>;

// Table row types now come directly from lib/db/schema.ts (Drizzle infers
// them from the schema itself) — nothing to hand-maintain here anymore.
