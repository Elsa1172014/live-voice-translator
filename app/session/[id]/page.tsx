import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionPlans } from '@/lib/db/schema';
import { buildSessionMemory } from '@/lib/gemini/memory';
import { buildSystemInstruction } from '@/lib/gemini/system-instruction';
import { getOrCreatePreferences } from '@/lib/db/helpers';
import { LiveClassroom } from './LiveClassroom';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const session = await db.query.sessions.findFirst({ where: and(eq(sessions.id, id), eq(sessions.userId, userId)) });
  if (!session) redirect('/topics');

  const prefs = await getOrCreatePreferences(userId);
  const plan = session.sessionPlanId
    ? await db.query.sessionPlans.findFirst({ where: eq(sessionPlans.id, session.sessionPlanId) })
    : null;

  const memory = await buildSessionMemory(userId);

  const systemInstruction = buildSystemInstruction({
    plan: plan
      ? {
          conversationGoal: plan.conversationGoal ?? '',
          languageGoal: plan.languageGoal ?? '',
          targetExpressions: plan.targetExpressions ?? [],
          watchErrors: plan.watchErrors ?? [],
          difficultyLevel: plan.difficultyLevel ?? 'adaptive',
        }
      : null,
    memory,
    topic: session.topic,
    topicCustomText: session.topicCustomText,
    englishVariant: prefs.englishVariant,
    correctionStrictness: prefs.correctionStrictness,
    arabicAllowed: false,
  });

  return (
    <LiveClassroom
      sessionId={session.id}
      topicLabel={session.topicCustomText ?? session.topic}
      systemInstruction={systemInstruction}
      captionVisibility={prefs.captionVisibility}
      silenceTimeoutMs={prefs.silenceTimeoutMs}
      arabicAllowed={prefs.arabicAllowed}
    />
  );
}
