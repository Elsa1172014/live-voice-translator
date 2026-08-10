# SpeakFlow AI — Personal English Coach

A live, voice-first English speaking coach: real-time conversation with Gemini
Live's native audio, natural barge-in, three-tier error correction, spaced
repetition for vocabulary and recurring errors, and a stable CEFR level
computed across sessions.

**Stack:** Next.js (App Router) · **Clerk** (auth) · **Neon** (serverless
Postgres) · **Drizzle ORM** · Gemini Live API · Vercel.

> This project originally used Supabase for both auth and the database. It
> was switched to **Clerk + Neon** because the Supabase account in use hit
> its free-project limit. Functionally nothing changes for you as the user —
> same features, same pages — just a different (and equally free) backend.

**Platform note:** this is a responsive Next.js web app (works on iPhone,
Android, and desktop through the browser, and can be "Added to Home Screen"
as a PWA). A native App Store app would be a separate, much larger project.

---

## 1. What's built

| Area | Status |
|---|---|
| Auth (Clerk — email/password, magic link, or social login, your choice) | ✅ |
| Onboarding + goals | ✅ |
| Topic selection (locked per session) | ✅ |
| Live voice classroom (Gemini Live, ephemeral tokens, barge-in, reconnection) | ✅ |
| Correction system (3-tier), silent tracking | ✅ |
| Vocabulary spaced repetition (1/3/7/14/30 days) | ✅ |
| Recurring error cards (2+ occurrences → recurring, 3 independent uses → mastered) | ✅ |
| Paragraph listening/reading activity | ✅ |
| Session assessment + stable level (weighted, last 5 sessions) | ✅ |
| Session report, vocabulary library, error cards, progress chart | ✅ |
| Settings (variant, speed, strictness, captions, interruption, etc.) | ✅ |
| Per-user data ownership (every query filtered by Clerk user id) | ✅ |
| Mock Mode when `GEMINI_API_KEY` is absent | ✅ |

Verified: the project passes `tsc --noEmit` with zero errors and a full
`next build` production build (all 17 routes compile and prerender).

---

## 2. One step at a time — what I need from you

**Step 1 — Create a Clerk application**
1. Go to https://dashboard.clerk.com → **Create application**.
2. Name it (e.g. `speakflow-ai`), pick email/password as a sign-in method
   (add Google if you want social login too).
3. Once created, go to **API Keys** and copy:
   - `Publishable key`
   - `Secret key`
4. Copy `.env.example` to `.env.local` and paste them in as
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

**Step 2 — Create a Neon project**
1. Go to https://console.neon.tech → **Create a project**.
2. Name it `speakflow-ai`, pick a nearby region.
3. On the project dashboard, copy the **pooled connection string** (the one
   with `-pooler` in the hostname — important for serverless).
4. Paste it into `.env.local` as `DATABASE_URL`.

**Step 3 — Push the database schema**
```bash
npm install
npm run db:push
```
This reads `lib/db/schema.ts` and creates all 15 tables directly in your
Neon database — no manual SQL needed.

**Step 4 — Get a Gemini API key**
1. Go to https://aistudio.google.com/apikey → **Create API key**.
2. Put it in `.env.local` as `GEMINI_API_KEY`.

**Step 5 — Run it locally**
```bash
npm run dev
```
Visit http://localhost:3000, sign up, complete onboarding, pick a topic, and talk.

**Step 6 — Deploy to Vercel**
```bash
npm i -g vercel
vercel
```
Add the same variables from `.env.local` in the Vercel project settings
(Production + Preview), then redeploy. Also add your production domain to
Clerk's **Allowed origins** (Clerk dashboard → Domains).

---

## 3. Architecture

```
Browser (mic) ──PCM16 16kHz──▶ Gemini Live API (WebSocket, ephemeral token)
       ▲                                │
       │ audio 24kHz                    │ function calls
       │                                ▼
       │                        Next.js API routes ──▶ Neon Postgres (Drizzle)
       └── playback ◀── transcripts ────┘   (ownership enforced by user_id = Clerk auth().userId)
```

- **Auth**: Clerk handles sign-up/sign-in/session cookies entirely;
  `middleware.ts` uses `clerkMiddleware()` to protect every route except the
  landing page and sign-in/up.
- **Database**: Neon Postgres via Drizzle ORM (`lib/db/schema.ts`). Since
  Neon has no built-in row-level security tied to Clerk, **every query is
  manually scoped** with `WHERE user_id = auth().userId` — this is done
  consistently in every API route and Server Component; there is no direct
  client-side database access anywhere (unlike the old Supabase anon-key
  model), which is actually a stronger security boundary.
- **New-user bootstrapping**: `lib/db/helpers.ts`'s `ensureProfile()` lazily
  creates a `profiles` + `user_preferences` row the first time a Clerk user
  is seen — no webhook required.
- **Voice**: `lib/gemini/live-client.ts` — continuous small-chunk PCM
  streaming, server-side VAD, barge-in, auto-reconnect with session
  resumption handles.
- **Tools**: `lib/gemini/tools.ts` declares the 11 functions from the spec;
  `app/api/tools/route.ts` executes each one server-side against Neon.
- **Spaced repetition**: `lib/utils/spaced-repetition.ts` — fixed ladder of
  1/3/7/14/30 days.
- **Stable level**: recomputed after every `save_session_assessment` call
  (`recomputeStableLevel` in `app/api/tools/route.ts`).

---

## 4. Useful commands

```bash
npm run db:push     # sync lib/db/schema.ts to your Neon database
npm run db:studio   # opens Drizzle Studio — a visual browser for your data
npm run typecheck   # tsc --noEmit
```

---

## 5. Security checklist

- No API keys ever reach the browser — only ephemeral, single-use,
  config-locked Gemini tokens (`uses: 1`, 30-minute expiry).
- No direct database access from the client — every read/write goes through
  a Next.js Route Handler or Server Component that checks Clerk's `auth()`
  first.
- Rate limiting on Gemini token minting (5/minute/user).
- No audio is stored by default — only transcripts and assessments.
- HTTPS is enforced automatically on Vercel.

---

## 6. What still needs your product judgment

- **Voice picker**: wire Gemini Live's available native-audio voices into
  Settings' `coach_voice` field.
- **Usage page**: a view summing conversation turns per day against the
  Gemini free-tier limits.
- **Images for the reading-mode paragraph activity**: currently text-only.
