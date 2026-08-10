import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { profiles, stableLevelHistory, sessions, vocabularyItems, languageErrors } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/db/helpers';
import { NavBar } from '@/components/layout/NavBar';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  await ensureProfile(userId, user?.firstName ?? undefined);

  const [profile, stable, recentSessions, dueVocab, recurringErrors] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.id, userId) }),
    db.query.stableLevelHistory.findFirst({ where: eq(stableLevelHistory.userId, userId), orderBy: desc(stableLevelHistory.computedAt) }),
    db.query.sessions.findMany({ where: eq(sessions.userId, userId), orderBy: desc(sessions.startedAt), limit: 5 }),
    db.query.vocabularyItems.findMany({ where: and(eq(vocabularyItems.userId, userId), lte(vocabularyItems.nextReviewAt, new Date())) }),
    db.query.languageErrors.findMany({ where: and(eq(languageErrors.userId, userId), inArray(languageErrors.status, ['recurring', 'practising'])) }),
  ]);

  return (
    <div>
      <NavBar />
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Welcome back, {profile?.displayName ?? 'Elsayed'}</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Stable level" value={stable?.stableCefr ?? 'Not yet established'} />
          <Stat label="Words due for review" value={String(dueVocab.length)} />
          <Stat label="Active error cards" value={String(recurringErrors.length)} />
        </div>

        <Link href="/topics" className="btn-primary mt-8 inline-flex">Start a new session</Link>

        <section className="mt-10">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-500">Recent sessions</h2>
          {!recentSessions.length && <p className="text-sm text-slate-500">No sessions yet — start your first one above.</p>}
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                href={s.status === 'completed' ? `/session/${s.id}/report` : `/session/${s.id}`}
                className="card flex items-center justify-between p-4 text-sm hover:bg-white/5"
              >
                <span>{(s.topicCustomText ?? s.topic).replace(/_/g, ' ')}</span>
                <span className="text-slate-500">{new Date(s.startedAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gold-400">{value}</p>
    </div>
  );
}
