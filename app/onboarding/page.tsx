'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CEFR_OPTIONS = ['A2', 'B1', 'B1+', 'B2'];

export default function OnboardingPage() {
  const router = useRouter();
  const [selfEstimate, setSelfEstimate] = useState('B1');
  const [goalText, setGoalText] = useState('Reach a strong B1 and approach B2 within two months.');
  const [prioritySkill, setPrioritySkill] = useState('Fluency');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selfEstimate, goalText, prioritySkill }),
    });
    setSaving(false);
    router.push('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">A quick starting point</h1>
      <p className="mt-2 text-sm text-slate-400">
        Your real level is confirmed from your actual performance — this is just a starting estimate.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <p className="mb-2 text-sm text-slate-400">Roughly, where do you think you are?</p>
          <div className="flex gap-2">
            {CEFR_OPTIONS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelfEstimate(lvl)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  selfEstimate === lvl ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-white/10 text-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Your two-month goal</span>
          <textarea
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 outline-none focus:border-gold-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Priority skill</span>
          <select
            value={prioritySkill}
            onChange={(e) => setPrioritySkill(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 outline-none focus:border-gold-500"
          >
            {['Fluency', 'Sentence order', 'Tenses', 'Prepositions', 'Active vocabulary', 'Pronunciation', 'Response speed', 'Coherence'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <button onClick={handleContinue} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Go to dashboard'}
        </button>
      </div>
    </main>
  );
}
