import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { languageErrors } from '@/lib/db/schema';
import { NavBar } from '@/components/layout/NavBar';

const STATUS_COLOR: Record<string, string> = {
  observed: 'text-slate-400',
  recurring: 'text-red-400',
  practising: 'text-amber-400',
  improving: 'text-sky-400',
  mastered: 'text-sage-400',
};

export default async function ErrorsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const errors = await db.query.languageErrors.findMany({
    where: eq(languageErrors.userId, userId),
    orderBy: desc(languageErrors.occurrenceCount),
  });

  const grouped = errors.reduce<Record<string, typeof errors>>((acc, e) => {
    acc[e.errorType] = acc[e.errorType] || [];
    acc[e.errorType].push(e);
    return acc;
  }, {});

  return (
    <div>
      <NavBar />
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Recurring error cards</h1>
        <p className="mt-1 text-sm text-slate-400">
          A card only becomes "recurring" after two occurrences, and "mastered" after three independent correct uses.
        </p>

        {!errors.length && <p className="mt-6 text-sm text-slate-500">No error cards yet.</p>}

        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([type, list]) => (
            <div key={type}>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-slate-500">{type.replace(/_/g, ' ')}</h2>
              <div className="space-y-2">
                {list.map((e) => (
                  <div key={e.id} className="card p-4 text-sm">
                    <p>
                      <span className="text-red-400 line-through">{e.originalText}</span>{' '}
                      <span className="text-sage-400">→ {e.correctedText}</span>
                    </p>
                    {e.ruleExplanation && <p className="mt-1 text-xs text-slate-400">{e.ruleExplanation}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className={STATUS_COLOR[e.status]}>{e.status}</span>
                      <span className="text-slate-500">seen {e.occurrenceCount}×</span>
                      <span className="text-slate-500">impact: {e.comprehensionImpact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
