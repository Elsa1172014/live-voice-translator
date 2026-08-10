import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { profiles, userGoals } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/db/helpers';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { selfEstimate, goalText, prioritySkill } = await req.json();

  await ensureProfile(userId);
  await db.update(profiles).set({ initialSelfEstimateCefr: selfEstimate, updatedAt: new Date() }).where(eq(profiles.id, userId));
  await db.insert(userGoals).values({ userId, goalText, targetCefr: 'B2', prioritySkill });

  return NextResponse.json({ ok: true });
}
