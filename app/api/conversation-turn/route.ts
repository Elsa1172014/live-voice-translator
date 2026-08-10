import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { conversationTurns } from '@/lib/db/schema';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { sessionId, speaker, transcript } = await req.json();
  if (!transcript?.trim()) return NextResponse.json({ ok: true });

  await db.insert(conversationTurns).values({ sessionId, userId, speaker, transcript });
  return NextResponse.json({ ok: true });
}
