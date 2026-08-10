/**
 * Internal tools the Live coach can call. These are never narrated to the
 * user (enforced in the system instruction). Each tool maps 1:1 to a
 * Supabase write handled server-side in app/api/tools/route.ts.
 */

export const LIVE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'save_vocabulary_item',
        description:
          "Save a new useful word, chunk, collocation, phrasal verb, or linking phrase that came up naturally in conversation.",
        parameters: {
          type: 'OBJECT',
          properties: {
            term: { type: 'STRING' },
            item_type: {
              type: 'STRING',
              enum: ['word', 'chunk', 'collocation', 'phrasal_verb', 'linking_phrase'],
            },
            meaning_en: { type: 'STRING' },
            meaning_ar: { type: 'STRING', description: 'Optional Arabic gloss, never spoken in-session.' },
            pronunciation_ipa: { type: 'STRING' },
            stress_pattern: { type: 'STRING' },
            original_example: { type: 'STRING' },
            personalised_example: { type: 'STRING', description: "Example tied to Elsayed's life/work." },
            cefr_level: { type: 'STRING' },
          },
          required: ['term', 'item_type', 'meaning_en'],
        },
      },
      {
        name: 'mark_vocabulary_attempt',
        description: "Log whether Elsayed used a previously-saved vocabulary item correctly just now.",
        parameters: {
          type: 'OBJECT',
          properties: {
            term: { type: 'STRING' },
            was_correct: { type: 'BOOLEAN' },
            produced_text: { type: 'STRING' },
          },
          required: ['term', 'was_correct'],
        },
      },
      {
        name: 'save_language_error',
        description:
          'Save or update a recurring-error card. Only escalate status to "recurring" if this is the second occurrence in this session or a repeat from a prior session.',
        parameters: {
          type: 'OBJECT',
          properties: {
            original_text: { type: 'STRING' },
            corrected_text: { type: 'STRING' },
            error_type: {
              type: 'STRING',
              enum: [
                'grammar', 'tense', 'sentence_structure', 'preposition', 'word_choice',
                'pronunciation', 'stress', 'fluency', 'unnatural_expression', 'coherence',
              ],
            },
            rule_explanation: { type: 'STRING' },
            personal_example: { type: 'STRING' },
            comprehension_impact: { type: 'STRING', enum: ['low', 'medium', 'high'] },
          },
          required: ['original_text', 'corrected_text', 'error_type'],
        },
      },
      {
        name: 'retrieve_due_reviews',
        description: 'Fetch vocabulary and error cards due for spaced-repetition review right now.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'retrieve_recurring_errors',
        description: "Fetch Elsayed's top recurring error cards to weave into the conversation.",
        parameters: { type: 'OBJECT', properties: { limit: { type: 'NUMBER' } } },
      },
      {
        name: 'update_topic',
        description: 'Change the locked session topic — only call this after Elsayed explicitly asks to change topic.',
        parameters: { type: 'OBJECT', properties: { new_topic: { type: 'STRING' } }, required: ['new_topic'] },
      },
      {
        name: 'save_paragraph_activity',
        description: 'Record a listening/reading paragraph activity presented this session.',
        parameters: {
          type: 'OBJECT',
          properties: {
            mode: { type: 'STRING', enum: ['listening', 'reading'] },
            paragraph_text: { type: 'STRING' },
            target_cefr: { type: 'STRING' },
          },
          required: ['mode', 'paragraph_text'],
        },
      },
      {
        name: 'save_session_assessment',
        description: 'Save the end-of-session CEFR assessment with evidence-backed scores.',
        parameters: {
          type: 'OBJECT',
          properties: {
            session_level_cefr: { type: 'STRING' },
            fluency_score: { type: 'NUMBER' },
            grammar_score: { type: 'NUMBER' },
            vocabulary_score: { type: 'NUMBER' },
            pronunciation_score: { type: 'NUMBER' },
            listening_score: { type: 'NUMBER' },
            coherence_score: { type: 'NUMBER' },
            interaction_score: { type: 'NUMBER' },
            ielts_estimate: { type: 'NUMBER' },
            strongest_improvement: { type: 'STRING' },
            next_priority: { type: 'STRING' },
            evidence: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Short verbatim quotes from Elsayed that justify the scores.',
            },
          },
          required: ['session_level_cefr'],
        },
      },
      {
        name: 'create_next_session_plan',
        description: "Draft the plan for Elsayed's next session before ending this one.",
        parameters: {
          type: 'OBJECT',
          properties: {
            conversation_goal: { type: 'STRING' },
            language_goal: { type: 'STRING' },
            target_expressions: { type: 'ARRAY', items: { type: 'STRING' } },
            watch_errors: { type: 'ARRAY', items: { type: 'STRING' } },
            difficulty_level: { type: 'STRING' },
          },
          required: ['conversation_goal', 'language_goal'],
        },
      },
      {
        name: 'request_arabic_explanation',
        description: 'Elsayed has explicitly asked (twice, or insisted) for a brief Arabic explanation. Logs the request; does not translate for you.',
        parameters: { type: 'OBJECT', properties: { reason: { type: 'STRING' } } },
      },
      {
        name: 'finish_session',
        description: 'End the session and trigger full assessment + report generation.',
        parameters: { type: 'OBJECT', properties: {} },
      },
    ],
  },
];

export type ToolName =
  | 'save_vocabulary_item'
  | 'mark_vocabulary_attempt'
  | 'save_language_error'
  | 'retrieve_due_reviews'
  | 'retrieve_recurring_errors'
  | 'update_topic'
  | 'save_paragraph_activity'
  | 'save_session_assessment'
  | 'create_next_session_plan'
  | 'request_arabic_explanation'
  | 'finish_session';
