import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { stableLevelHistory, sessions, languageErrors, vocabularyItems, userGoals } from '@/lib/db/schema';
import type { SessionMemory } from '@/types/database';

export async function buildSessionMemory(userId: string): Promise<SessionMemory> {
  const [stable, recentSessions, recurringErrors, dueVocab, goal] = await Promise.all([
    db.query.stableLevelHistory.findFirst({
      where: eq(stableLevelHistory.userId, userId),
      orderBy: desc(stableLevelHistory.computedAt),
    }),
    db.query.sessions.findMany({
      where: and(eq(sessions.userId, userId), eq(sessions.status, 'completed')),
      orderBy: desc(sessions.startedAt),
      limit: 3,
    }),
    db.query.languageErrors.findMany({
      where: and(eq(languageErrors.userId, userId), inArray(languageErrors.status, ['recurring', 'practising'])),
      orderBy: desc(languageErrors.occurrenceCount),
      limit: 5,
    }),
    db.query.vocabularyItems.findMany({
      where: and(eq(vocabularyItems.userId, userId), lte(vocabularyItems.nextReviewAt, new Date())),
      limit: 8,
    }),
    db.query.userGoals.findFirst({
      where: eq(userGoals.userId, userId),
      orderBy: desc(userGoals.createdAt),
    }),
  ]);

  return {
    stableLevel: stable?.stableCefr ?? null,
    recentSessionSummaries: recentSessions.map((s) => s.summary).filter((s): s is string => !!s),
    topRecurringErrors: recurringErrors.map((e) => ({ original: e.originalText, corrected: e.correctedText, type: e.errorType })),
    vocabularyDueForReview: dueVocab.map((v) => ({ term: v.term })),
    prioritySkill: goal?.prioritySkill ?? null,
  };
}
