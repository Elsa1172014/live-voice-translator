import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionAssessments, stableLevelHistory, vocabularyItems, languageErrors } from '@/lib/db/schema';

export default async function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const session = await db.query.sessions.findFirst({ where: and(eq(sessions.id, id), eq(sessions.userId, userId)) });
  if (!session) redirect('/dashboard');

  const [assessment, stable, newVocab, errors] = await Promise.all([
    db.query.sessionAssessments.findFirst({ where: eq(sessionAssessments.sessionId, id), orderBy: desc(sessionAssessments.createdAt) }),
    db.query.stableLevelHistory.findFirst({ where: eq(stableLevelHistory.userId, userId), orderBy: desc(stableLevelHistory.computedAt) }),
    db.query.vocabularyItems.findMany({ where: eq(vocabularyItems.sessionId, id) }),
    db.query.languageErrors.findMany({ where: eq(languageErrors.userId, userId), orderBy: desc(languageErrors.updatedAt), limit: 3 }),
  ]);

  const isPreliminary = !stable || assessment?.isPreliminary;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-14">
      <p className="text-xs uppercase tracking-wide text-slate-500">Session report</p>
      <h1 className="mt-1 text-2xl font-semibold">{session.topicCustomText ?? session.topic.replace(/_/g, ' ')}</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-xs text-slate-500">Session level</p>
          <p className="mt-1 text-2xl font-semibold text-gold-400">{assessment?.sessionLevelCefr ?? '—'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Stable overall level {isPreliminary && '(preliminary estimate)'}</p>
          <p className="mt-1 text-2xl font-semibold">{stable?.stableCefr ?? 'Not yet established'}</p>
        </div>
      </div>

      {assessment && (
        <div className="card mt-4 grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-4">
          <Score label="Fluency" value={assessment.fluencyScore} />
          <Score label="Grammar" value={assessment.grammarScore} />
          <Score label="Vocabulary" value={assessment.vocabularyScore} />
          <Score label="Pronunciation" value={assessment.pronunciationScore} />
          <Score label="Listening" value={assessment.listeningScore} />
          <Score label="Coherence" value={assessment.coherenceScore} />
          <Score label="Interaction" value={assessment.interactionScore} />
          <Score label="IELTS est." value={assessment.ieltsEstimate} suffix=" (estimate only)" />
        </div>
      )}

      {assessment?.strongestImprovement && <Section title="Strongest improvement">{assessment.strongestImprovement}</Section>}
      {assessment?.nextPriority && <Section title="Priority for next session">{assessment.nextPriority}</Section>}

      {!!newVocab.length && (
        <Section title="New words and expressions">
          <ul className="space-y-1">
            {newVocab.map((v) => (
              <li key={v.id} className="text-sm">
                <span className="text-gold-400">{v.term}</span> — {v.meaningEn}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!!errors.length && (
        <Section title="Recurring error cards">
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="text-red-400 line-through">{e.originalText}</span>{' '}
                <span className="text-sage-400">→ {e.correctedText}</span>
                <span className="ml-2 text-xs text-slate-500">({e.status})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-10 flex gap-3">
        <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
        <Link href="/topics" className="btn-primary">Start another session</Link>
      </div>
    </main>
  );
}

function Score({ label, value, suffix = '' }: { label: string; value: string | null | undefined; suffix?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value != null ? `${value}${suffix}` : '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mt-4 p-5">
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}
