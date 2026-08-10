import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userPreferences } from '@/lib/db/schema';
import { getOrCreatePreferences } from '@/lib/db/helpers';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const prefs = await getOrCreatePreferences(userId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  await getOrCreatePreferences(userId); // ensure row exists before updating
  await db.update(userPreferences).set({ ...body, updatedAt: new Date() }).where(eq(userPreferences.userId, userId));

  return NextResponse.json({ ok: true });
}
