// Fixed interval ladder in days, per spec: 1, 3, 7, 14, 30.
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export function nextReviewDate(stage: number): Date {
  const clamped = Math.min(stage, REVIEW_INTERVALS_DAYS.length - 1);
  const days = REVIEW_INTERVALS_DAYS[clamped];
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function advanceStage(currentStage: number, wasCorrect: boolean): number {
  if (wasCorrect) return Math.min(currentStage + 1, REVIEW_INTERVALS_DAYS.length - 1);
  // A wrong attempt drops the item back one stage, never below 0.
  return Math.max(currentStage - 1, 0);
}

// An error becomes "recurring" once it has appeared twice in one session
// or in two different sessions — never on a single slip.
export function shouldMarkRecurring(occurrenceCount: number, distinctSessions: number): boolean {
  return occurrenceCount >= 2 || distinctSessions >= 2;
}

// An error is only "mastered" after 3 independent correct uses across
// 3 different sessions.
export function shouldMarkMastered(independentCorrectSessions: number): boolean {
  return independentCorrectSessions >= 3;
}
