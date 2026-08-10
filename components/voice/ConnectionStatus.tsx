'use client';

import clsx from 'clsx';
import type { CoachStatus } from '@/lib/gemini/live-client';

const DOT_COLOR: Record<CoachStatus, string> = {
  idle: 'bg-slate-500',
  connecting: 'bg-sage-400 animate-pulse',
  listening: 'bg-sage-400',
  thinking: 'bg-gold-400 animate-pulse',
  speaking: 'bg-gold-400',
  reconnecting: 'bg-amber-400 animate-pulse',
  error: 'bg-red-500',
};

export function ConnectionStatus({ status }: { status: CoachStatus }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-navy-900/70 px-3 py-1 text-xs text-slate-300">
      <span className={clsx('h-2 w-2 rounded-full', DOT_COLOR[status])} />
      <span className="capitalize">{status}</span>
    </div>
  );
}
