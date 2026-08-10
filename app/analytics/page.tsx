import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stableLevelHistory, sessionAssessments } from '@/lib/db/schema';
import { NavBar } from '@/components/layout/NavBar';
import { ProgressChart } from '@/components/analytics/ProgressChart';

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [history, assessments] = await Promise.all([
    db.query.stableLevelHistory.findMany({ where: eq(stableLevelHistory.userId, userId), orderBy: asc(stableLevelHistory.computedAt) }),
    db.query.sessionAssessments.findMany({ where: eq(sessionAssessments.userId, userId), orderBy: desc(sessionAssessments.createdAt), limit: 10 }),
  ]);

  const points = history.map((h) => ({
    date: new Date(h.computedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    level: h.stableCefr,
  }));

  return (
    <div>
      <NavBar />
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Progress over time</h1>

        <div className="card mt-6 p-5">
          <ProgressChart points={points} />
        </div>

        <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-slate-500">Recent session assessments</h2>
        <div className="space-y-2">
          {!assessments.length && <p className="text-sm text-slate-500">No assessments yet.</p>}
          {assessments.map((a) => (
            <div key={a.id} className="card flex items-center justify-between p-4 text-sm">
              <span>{new Date(a.createdAt).toLocaleDateString()}</span>
              <span className="text-gold-400">{a.sessionLevelCefr}</span>
              <span className="text-slate-500">{a.strongestImprovement ?? '—'}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
