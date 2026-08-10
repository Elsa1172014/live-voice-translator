'use client';

import { useEffect, useState } from 'react';
import { NavBar } from '@/components/layout/NavBar';
import type { UserPreferences } from '@/types/database';

const DEFAULTS: UserPreferences = {
  english_variant: 'british',
  coach_voice: 'default',
  speech_speed: 'normal',
  correction_strictness: 'balanced',
  caption_visibility: 'on_correction',
  images_enabled: true,
  silence_timeout_ms: 1200,
  interruption_sensitivity: 'medium',
  question_difficulty: 'adaptive',
  arabic_allowed: false,
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/preferences');
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          english_variant: data.englishVariant,
          coach_voice: data.coachVoice,
          speech_speed: data.speechSpeed,
          correction_strictness: data.correctionStrictness,
          caption_visibility: data.captionVisibility,
          images_enabled: data.imagesEnabled,
          silence_timeout_ms: data.silenceTimeoutMs,
          interruption_sensitivity: data.interruptionSensitivity,
          question_difficulty: data.questionDifficulty,
          arabic_allowed: data.arabicAllowed,
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        englishVariant: prefs.english_variant,
        coachVoice: prefs.coach_voice,
        speechSpeed: prefs.speech_speed,
        correctionStrictness: prefs.correction_strictness,
        captionVisibility: prefs.caption_visibility,
        imagesEnabled: prefs.images_enabled,
        silenceTimeoutMs: prefs.silence_timeout_ms,
        interruptionSensitivity: prefs.interruption_sensitivity,
        questionDifficulty: prefs.question_difficulty,
        arabicAllowed: prefs.arabic_allowed,
      }),
    });
    setSaving(false);
  }

  if (loading) return null;

  return (
    <div>
      <NavBar />
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <div className="mt-6 space-y-5">
          <Select label="English variant" value={prefs.english_variant} options={['british', 'american']} onChange={(v) => setPrefs({ ...prefs, english_variant: v as any })} />
          <Select label="Speech speed" value={prefs.speech_speed} options={['slow', 'normal', 'fast']} onChange={(v) => setPrefs({ ...prefs, speech_speed: v as any })} />
          <Select label="Correction strictness" value={prefs.correction_strictness} options={['light', 'balanced', 'strict']} onChange={(v) => setPrefs({ ...prefs, correction_strictness: v as any })} />
          <Select label="Caption visibility" value={prefs.caption_visibility} options={['hidden', 'on_correction', 'always']} onChange={(v) => setPrefs({ ...prefs, caption_visibility: v as any })} />
          <Select label="Interruption sensitivity" value={prefs.interruption_sensitivity} options={['low', 'medium', 'high']} onChange={(v) => setPrefs({ ...prefs, interruption_sensitivity: v as any })} />
          <Select label="Question difficulty" value={prefs.question_difficulty} options={['easier', 'adaptive', 'harder']} onChange={(v) => setPrefs({ ...prefs, question_difficulty: v as any })} />

          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Silence before turn ends ({prefs.silence_timeout_ms}ms)</span>
            <input
              type="range" min={400} max={3000} step={100}
              value={prefs.silence_timeout_ms}
              onChange={(e) => setPrefs({ ...prefs, silence_timeout_ms: Number(e.target.value) })}
              className="w-full"
            />
          </label>

          <Toggle label="Show images during activities" checked={prefs.images_enabled} onChange={(v) => setPrefs({ ...prefs, images_enabled: v })} />
          <Toggle label="Allow Arabic (after two explicit requests)" checked={prefs.arabic_allowed} onChange={(v) => setPrefs({ ...prefs, arabic_allowed: v })} />

          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </main>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 outline-none focus:border-gold-500">
        {options.map((o) => (
          <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-9 accent-gold-500" />
    </label>
  );
}
