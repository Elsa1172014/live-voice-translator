import { NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionPlans } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/db/helpers';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await ensureProfile(userId);

  const { topic, topicCustomText } = await req.json();

  // Pull the most recently drafted (unused) plan, if create_next_session_plan
  // produced one at the end of the last session.
  const pendingPlan = await db.query.sessionPlans.findFirst({
    where: and(eq(sessionPlans.userId, userId), isNull(sessionPlans.sessionId)),
    orderBy: desc(sessionPlans.createdAt),
  });

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      topic,
      topicCustomText: topicCustomText ?? null,
      status: 'active',
      sessionPlanId: pendingPlan?.id ?? null,
    })
    .returning();

  if (pendingPlan?.id) {
    await db.update(sessionPlans).set({ sessionId: session.id }).where(eq(sessionPlans.id, pendingPlan.id));
  }

  return NextResponse.json({ sessionId: session.id });
}
