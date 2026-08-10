import Link from 'next/link';
import { Mic, BrainCircuit, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
      <span className="mb-4 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1 text-xs font-medium tracking-wide text-gold-400">
        SpeakFlow AI — Personal English Coach
      </span>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
        A live speaking coach that actually remembers you.
      </h1>
      <p className="mt-5 max-w-xl text-slate-400">
        Real-time voice conversation, natural interruption, honest correction, and a memory that
        carries every session forward — built for real, sustained progress toward B2.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/sign-up" className="btn-primary">Start speaking</Link>
        <Link href="/sign-in" className="btn-secondary">I have an account</Link>
      </div>

      <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
        <Feature icon={<Mic size={20} />} title="Natural, live conversation" desc="Speak freely, interrupt the coach, and get a real answer back — not a scripted quiz." />
        <Feature icon={<BrainCircuit size={20} />} title="Remembers every session" desc="Vocabulary, recurring errors, and your level all carry forward automatically." />
        <Feature icon={<TrendingUp size={20} />} title="Honest CEFR tracking" desc="A stable level computed across sessions, with real evidence — no inflated praise." />
      </div>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-5 text-left">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}
