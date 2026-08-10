'use client';

import type { CoachStatus } from '@/lib/gemini/live-client';
import clsx from 'clsx';

const STATUS_LABEL: Record<CoachStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  reconnecting: 'Reconnecting…',
  error: 'Connection issue',
};

const STATUS_RING: Record<CoachStatus, string> = {
  idle: 'from-navy-600 to-navy-700',
  connecting: 'from-sage-500 to-navy-700 animate-pulseSoft',
  listening: 'from-sage-400 to-sage-600 animate-pulseSoft',
  thinking: 'from-gold-500 to-navy-700 animate-pulseSoft',
  speaking: 'from-gold-400 to-gold-600',
  reconnecting: 'from-navy-500 to-navy-700 animate-pulseSoft',
  error: 'from-red-500 to-navy-700',
};

export function VoiceOrb({ status }: { status: CoachStatus }) {
  const bars = status === 'speaking' ? 5 : status === 'listening' ? 3 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={clsx(
          'relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br shadow-2xl shadow-black/40 sm:h-48 sm:w-48',
          STATUS_RING[status]
        )}
      >
        <div className="absolute inset-2 rounded-full bg-navy-900/60 backdrop-blur-sm" />
        <div className="relative flex items-end gap-1.5">
          {bars > 0
            ? Array.from({ length: bars }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-white/90 animate-wave"
                  style={{
                    height: `${18 + (i % 3) * 10}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))
            : <span className="h-2 w-2 rounded-full bg-white/60" />}
        </div>
      </div>
      <p className="text-sm font-medium tracking-wide text-slate-300">{STATUS_LABEL[status]}</p>
    </div>
  );
}
