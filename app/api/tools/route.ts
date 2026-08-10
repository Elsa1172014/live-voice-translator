import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, lte } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  vocabularyItems, vocabularyAttempts, languageErrors, errorOccurrences,
  reviewSchedule, sessions, sessionPlans, paragraphActivities, sessionAssessments,
  stableLevelHistory,
} from '@/lib/db/schema';
import { nextReviewDate, shouldMarkRecurring } from '@/lib/utils/spaced-repetition';
import type { ToolName } from '@/lib/gemini/tools';

interface ToolCallBody {
  name: ToolName;
  args: Record<string, any>;
  sessionId: string;
}

// Single dispatcher for every tool the Live coach can invoke. Called by the
// client hook (useLiveVoiceSession) whenever Gemini emits a functionCall.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body: ToolCallBody = await req.json();
  const { name, args, sessionId } = body;

  try {
    switch (name) {
      case 'save_vocabulary_item': {
        const [item] = await db
          .insert(vocabularyItems)
          .values({
            userId,
            sessionId,
            term: args.term,
            itemType: args.item_type,
            meaningEn: args.meaning_en,
            meaningAr: args.meaning_ar ?? null,
            pronunciationIpa: args.pronunciation_ipa ?? null,
            stressPattern: args.stress_pattern ?? null,
            originalExample: args.original_example ?? null,
            personalisedExample: args.personalised_example ?? null,
            cefrLevel: args.cefr_level ?? null,
          })
          .returning();

        await db.insert(reviewSchedule).values({
          userId,
          itemType: 'vocabulary',
          itemId: item.id,
          intervalStage: 0,
          dueAt: nextReviewDate(0),
        });
        return NextResponse.json({ ok: true, id: item.id });
      }

      case 'mark_vocabulary_attempt': {
        const item = await db.query.vocabularyItems.findFirst({
          where: and(eq(vocabularyItems.userId, userId), ilike(vocabularyItems.term, args.term)),
          orderBy: desc(vocabularyItems.firstSeenAt),
        });
        if (!item) return NextResponse.json({ ok: false, reason: 'item_not_found' });

        await db.insert(vocabularyAttempts).values({
          vocabularyItemId: item.id,
          userId,
          sessionId,
          wasCorrect: args.was_correct,
          producedText: args.produced_text ?? null,
        });

        const nextCorrect = item.correctUses + (args.was_correct ? 1 : 0);
        const nextIncorrect = item.incorrectUses + (args.was_correct ? 0 : 1);
        const status = nextCorrect >= 5 ? 'mastered' : nextCorrect >= 2 ? 'practising' : 'learning';

        await db
          .update(vocabularyItems)
          .set({ correctUses: nextCorrect, incorrectUses: nextIncorrect, status, exposures: item.exposures + 1 })
          .where(eq(vocabularyItems.id, item.id));

        return NextResponse.json({ ok: true });
      }

      case 'save_language_error': {
        const existing = await db.query.languageErrors.findFirst({
          where: and(
            eq(languageErrors.userId, userId),
            eq(languageErrors.errorType, args.error_type),
            ilike(languageErrors.correctedText, args.corrected_text)
          ),
        });

        if (existing) {
          const newCount = existing.occurrenceCount + 1;
          const priorOccurrences = await db.query.errorOccurrences.findMany({
            where: eq(errorOccurrences.languageErrorId, existing.id),
          });
          const distinctCount = new Set(priorOccurrences.map((r) => r.sessionId)).size + 1;
          const status = shouldMarkRecurring(newCount, distinctCount) ? 'recurring' : existing.status;

          await db.update(languageErrors).set({ occurrenceCount: newCount, status, updatedAt: new Date() }).where(eq(languageErrors.id, existing.id));
          await db.insert(errorOccurrences).values({ languageErrorId: existing.id, userId, sessionId });

          return NextResponse.json({ ok: true, id: existing.id, status });
        }

        const [created] = await db
          .insert(languageErrors)
          .values({
            userId,
            errorType: args.error_type,
            originalText: args.original_text,
            correctedText: args.corrected_text,
            ruleExplanation: args.rule_explanation ?? null,
            personalExample: args.personal_example ?? null,
            comprehensionImpact: args.comprehension_impact ?? 'low',
            status: 'observed',
            nextReviewAt: nextReviewDate(0),
          })
          .returning();

        await db.insert(errorOccurrences).values({ languageErrorId: created.id, userId, sessionId });
        await db.insert(reviewSchedule).values({
          userId, itemType: 'error', itemId: created.id, intervalStage: 0, dueAt: nextReviewDate(0),
        });

        return NextResponse.json({ ok: true, id: created.id });
      }

      case 'retrieve_due_reviews': {
        const due = await db.query.reviewSchedule.findMany({
          where: and(eq(reviewSchedule.userId, userId), lte(reviewSchedule.dueAt, new Date())),
          orderBy: reviewSchedule.dueAt,
          limit: 10,
        });
        return NextResponse.json({ ok: true, due });
      }

      case 'retrieve_recurring_errors': {
        const errors = await db.query.languageErrors.findMany({
          where: and(eq(languageErrors.userId, userId)),
          orderBy: desc(languageErrors.occurrenceCount),
          limit: args.limit ?? 5,
        });
        const filtered = errors.filter((e) => e.status === 'recurring' || e.status === 'practising');
        return NextResponse.json({ ok: true, errors: filtered });
      }

      case 'update_topic': {
        await db.update(sessions).set({ topicCustomText: args.new_topic }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
        return NextResponse.json({ ok: true });
      }

      case 'save_paragraph_activity': {
        const [created] = await db
          .insert(paragraphActivities)
          .values({ sessionId, userId, mode: args.mode, paragraphText: args.paragraph_text, targetCefr: args.target_cefr ?? null })
          .returning();
        return NextResponse.json({ ok: true, id: created.id });
      }

      case 'save_session_assessment': {
        const [created] = await db
          .insert(sessionAssessments)
          .values({
            sessionId,
            userId,
            sessionLevelCefr: args.session_level_cefr,
            fluencyScore: args.fluency_score ?? null,
            grammarScore: args.grammar_score ?? null,
            vocabularyScore: args.vocabulary_score ?? null,
            pronunciationScore: args.pronunciation_score ?? null,
            listeningScore: args.listening_score ?? null,
            coherenceScore: args.coherence_score ?? null,
            interactionScore: args.interaction_score ?? null,
            ieltsEstimate: args.ielts_estimate ?? null,
            strongestImprovement: args.strongest_improvement ?? null,
            nextPriority: args.next_priority ?? null,
            evidence: args.evidence ?? [],
            isPreliminary: false,
          })
          .returning();

        await recomputeStableLevel(userId);
        return NextResponse.json({ ok: true, id: created.id });
      }

      case 'create_next_session_plan': {
        const [created] = await db
          .insert(sessionPlans)
          .values({
            userId,
            sessionId: null,
            conversationGoal: args.conversation_goal,
            languageGoal: args.language_goal,
            targetExpressions: args.target_expressions ?? [],
            watchErrors: args.watch_errors ?? [],
            difficultyLevel: args.difficulty_level ?? 'adaptive',
          })
          .returning();
        return NextResponse.json({ ok: true, id: created.id });
      }

      case 'request_arabic_explanation': {
        return NextResponse.json({ ok: true, granted: true });
      }

      case 'finish_session': {
        await db.update(sessions).set({ status: 'completed', endedAt: new Date() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${name}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`Tool ${name} failed:`, err);
    return NextResponse.json({ error: 'Tool execution failed.' }, { status: 500 });
  }
}

// Weighted stable-level recompute over the last 5 sessions (recent-weighted).
async function recomputeStableLevel(userId: string) {
  const recent = await db.query.sessionAssessments.findMany({
    where: eq(sessionAssessments.userId, userId),
    orderBy: desc(sessionAssessments.createdAt),
    limit: 5,
  });

  if (recent.length < 3) return; // not enough data — stays "preliminary"

  const CEFR_ORDER = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
  const weights = [1, 0.85, 0.7, 0.55, 0.4].slice(0, recent.length);
  let weightedSum = 0;
  let weightTotal = 0;

  recent.forEach((r, i) => {
    const idx = CEFR_ORDER.indexOf(r.sessionLevelCefr ?? '');
    if (idx === -1) return;
    weightedSum += idx * weights[i];
    weightTotal += weights[i];
  });

  if (weightTotal === 0) return;
  const stableIdx = Math.round(weightedSum / weightTotal);
  const stableCefr = CEFR_ORDER[Math.min(Math.max(stableIdx, 0), CEFR_ORDER.length - 1)];
  const confidence = Math.min(95, 50 + recent.length * 9);

  await db.insert(stableLevelHistory).values({
    userId,
    stableCefr,
    confidencePct: String(confidence),
    basedOnSessionIds: recent.map((r) => r.sessionId),
  });
}
