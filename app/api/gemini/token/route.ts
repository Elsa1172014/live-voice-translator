import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { auth } from '@clerk/nextjs/server';

// Rate limiting: naive in-memory window per user (fine for Hobby tier /
// single-instance dev; swap for Upstash/Redis before scaling past one
// serverless instance).
const RATE_WINDOW_MS = 60_000;
const MAX_TOKENS_PER_WINDOW = 5;
const bucket = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (bucket.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_TOKENS_PER_WINDOW) {
    bucket.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  bucket.set(userId, timestamps);
  return false;
}

export async function POST() {
  // 1. Verify the caller is an authenticated app user before minting anything.
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (rateLimited(userId)) {
    return NextResponse.json({ error: 'Too many token requests. Wait a moment.' }, { status: 429 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured on the server. Running in Mock Mode.', mock: true },
      { status: 200 }
    );
  }

  try {
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    // Lock the token to this exact model + config so it can't be reused
    // for anything else, per Google's guidance for client-to-server auth.
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            sessionResumption: {},
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return NextResponse.json({
      token: token.name,
      expireTime,
      model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
      mock: false,
    });
  } catch (err) {
    console.error('Ephemeral token creation failed:', err);
    return NextResponse.json({ error: 'Could not create a Live session token.' }, { status: 502 });
  }
}
