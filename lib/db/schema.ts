import {
  pgTable, text, integer, numeric, boolean, timestamp, uuid, jsonb, pgEnum,
} from 'drizzle-orm/pg-core';

// ------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------
export const englishVariantEnum = pgEnum('english_variant', ['british', 'american']);
export const speechSpeedEnum = pgEnum('speech_speed', ['slow', 'normal', 'fast']);
export const strictnessEnum = pgEnum('correction_strictness', ['light', 'balanced', 'strict']);
export const captionVisibilityEnum = pgEnum('caption_visibility', ['hidden', 'on_correction', 'always']);
export const interruptionSensitivityEnum = pgEnum('interruption_sensitivity', ['low', 'medium', 'high']);
export const questionDifficultyEnum = pgEnum('question_difficulty', ['easier', 'adaptive', 'harder']);
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed', 'abandoned']);
export const turnSpeakerEnum = pgEnum('turn_speaker', ['user', 'coach']);
export const vocabItemTypeEnum = pgEnum('vocab_item_type', ['word', 'chunk', 'collocation', 'phrasal_verb', 'linking_phrase']);
export const vocabStatusEnum = pgEnum('vocab_status', ['new', 'learning', 'practising', 'mastered']);
export const errorTypeEnum = pgEnum('error_type', [
  'grammar', 'tense', 'sentence_structure', 'preposition', 'word_choice',
  'pronunciation', 'stress', 'fluency', 'unnatural_expression', 'coherence',
]);
export const errorStatusEnum = pgEnum('error_status', ['observed', 'recurring', 'practising', 'improving', 'mastered']);
export const impactEnum = pgEnum('comprehension_impact', ['low', 'medium', 'high']);
export const reviewItemTypeEnum = pgEnum('review_item_type', ['vocabulary', 'error']);
export const paragraphModeEnum = pgEnum('paragraph_mode', ['listening', 'reading']);

// ------------------------------------------------------------------
// profiles — id is the Clerk user id directly (no separate auth table)
// ------------------------------------------------------------------
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Clerk user id, e.g. "user_2abc..."
  displayName: text('display_name').notNull().default('Learner'),
  nativeLanguage: text('native_language').notNull().default('ar'),
  targetVariant: englishVariantEnum('target_variant').notNull().default('british'),
  initialSelfEstimateCefr: text('initial_self_estimate_cefr').default('B1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userGoals = pgTable('user_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  goalText: text('goal_text').notNull(),
  targetCefr: text('target_cefr'),
  targetDate: timestamp('target_date', { mode: 'date' }),
  prioritySkill: text('priority_skill'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id').primaryKey(),
  englishVariant: englishVariantEnum('english_variant').notNull().default('british'),
  coachVoice: text('coach_voice').notNull().default('default'),
  speechSpeed: speechSpeedEnum('speech_speed').notNull().default('normal'),
  correctionStrictness: strictnessEnum('correction_strictness').notNull().default('balanced'),
  captionVisibility: captionVisibilityEnum('caption_visibility').notNull().default('on_correction'),
  imagesEnabled: boolean('images_enabled').notNull().default(true),
  silenceTimeoutMs: integer('silence_timeout_ms').notNull().default(1200),
  interruptionSensitivity: interruptionSensitivityEnum('interruption_sensitivity').notNull().default('medium'),
  questionDifficulty: questionDifficultyEnum('question_difficulty').notNull().default('adaptive'),
  arabicAllowed: boolean('arabic_allowed').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------
// sessions / plans / turns
// ------------------------------------------------------------------
export const sessionPlans = pgTable('session_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id'), // set once the plan is attached to a session
  conversationGoal: text('conversation_goal'),
  languageGoal: text('language_goal'),
  targetExpressions: text('target_expressions').array().default([]),
  watchErrors: text('watch_errors').array().default([]),
  includeParagraphActivity: boolean('include_paragraph_activity').default(false),
  difficultyLevel: text('difficulty_level').default('adaptive'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  topic: text('topic').notNull(),
  topicCustomText: text('topic_custom_text'),
  status: sessionStatusEnum('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  sessionPlanId: uuid('session_plan_id'),
  summary: text('summary'),
});

export const conversationTurns = pgTable('conversation_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: text('user_id').notNull(),
  speaker: turnSpeakerEnum('speaker').notNull(),
  transcript: text('transcript').notNull(),
  turnStartedMs: integer('turn_started_ms'),
  turnEndedMs: integer('turn_ended_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------
// assessments / stable level
// ------------------------------------------------------------------
export const sessionAssessments = pgTable('session_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: text('user_id').notNull(),
  sessionLevelCefr: text('session_level_cefr'),
  fluencyScore: numeric('fluency_score'),
  grammarScore: numeric('grammar_score'),
  vocabularyScore: numeric('vocabulary_score'),
  pronunciationScore: numeric('pronunciation_score'),
  listeningScore: numeric('listening_score'),
  coherenceScore: numeric('coherence_score'),
  interactionScore: numeric('interaction_score'),
  ieltsEstimate: numeric('ielts_estimate'),
  confidencePct: numeric('confidence_pct'),
  progressToNextLevelPct: numeric('progress_to_next_level_pct'),
  strongestImprovement: text('strongest_improvement'),
  nextPriority: text('next_priority'),
  evidence: jsonb('evidence').default([]),
  isPreliminary: boolean('is_preliminary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stableLevelHistory = pgTable('stable_level_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  stableCefr: text('stable_cefr').notNull(),
  confidencePct: numeric('confidence_pct'),
  basedOnSessionIds: uuid('based_on_session_ids').array().default([]),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------
// vocabulary
// ------------------------------------------------------------------
export const vocabularyItems = pgTable('vocabulary_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id'),
  term: text('term').notNull(),
  itemType: vocabItemTypeEnum('item_type').notNull(),
  meaningEn: text('meaning_en'),
  meaningAr: text('meaning_ar'),
  pronunciationIpa: text('pronunciation_ipa'),
  stressPattern: text('stress_pattern'),
  originalExample: text('original_example'),
  personalisedExample: text('personalised_example'),
  userGeneratedSentence: text('user_generated_sentence'),
  cefrLevel: text('cefr_level'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  exposures: integer('exposures').notNull().default(1),
  correctUses: integer('correct_uses').notNull().default(0),
  incorrectUses: integer('incorrect_uses').notNull().default(0),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }).notNull().defaultNow(),
  status: vocabStatusEnum('status').notNull().default('new'),
});

export const vocabularyAttempts = pgTable('vocabulary_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  vocabularyItemId: uuid('vocabulary_item_id').notNull(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id'),
  wasCorrect: boolean('was_correct').notNull(),
  producedText: text('produced_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------
// errors
// ------------------------------------------------------------------
export const languageErrors = pgTable('language_errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  errorType: errorTypeEnum('error_type').notNull(),
  originalText: text('original_text').notNull(),
  correctedText: text('corrected_text').notNull(),
  ruleExplanation: text('rule_explanation'),
  personalExample: text('personal_example'),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  comprehensionImpact: impactEnum('comprehension_impact').notNull().default('low'),
  status: errorStatusEnum('status').notNull().default('observed'),
  masteredIndependentUses: integer('mastered_independent_uses').notNull().default(0),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const errorOccurrences = pgTable('error_occurrences', {
  id: uuid('id').primaryKey().defaultRandom(),
  languageErrorId: uuid('language_error_id').notNull(),
  userId: text('user_id').notNull(),
  sessionId: uuid('session_id'),
  topic: text('topic'),
  turnTimestampMs: integer('turn_timestamp_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reviewSchedule = pgTable('review_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  itemType: reviewItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  intervalStage: integer('interval_stage').notNull().default(0),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------
// paragraph activity
// ------------------------------------------------------------------
export const paragraphActivities = pgTable('paragraph_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: text('user_id').notNull(),
  mode: paragraphModeEnum('mode').notNull(),
  paragraphText: text('paragraph_text').notNull(),
  imageUrl: text('image_url'),
  targetCefr: text('target_cefr'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paragraphResponses = pgTable('paragraph_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  paragraphActivityId: uuid('paragraph_activity_id').notNull(),
  userId: text('user_id').notNull(),
  mainIdeaResponse: text('main_idea_response'),
  summaryResponse: text('summary_response'),
  comprehensionQ1: text('comprehension_q1'),
  comprehensionQ2: text('comprehension_q2'),
  opinionResponse: text('opinion_response'),
  mainIdeaScore: numeric('main_idea_score'),
  detailCaptureScore: numeric('detail_capture_score'),
  paraphraseScore: numeric('paraphrase_score'),
  languageAccuracyScore: numeric('language_accuracy_score'),
  coherenceScore: numeric('coherence_score'),
  independenceScore: numeric('independence_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
