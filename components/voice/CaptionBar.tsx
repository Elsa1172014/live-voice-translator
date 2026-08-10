'use client';

interface CaptionBarProps {
  userCaption: string;
  coachCaption: string;
  visible: boolean;
}

export function CaptionBar({ userCaption, coachCaption, visible }: CaptionBarProps) {
  if (!visible) return null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-2 rounded-xl border border-white/5 bg-navy-900/70 p-4 text-sm">
      {coachCaption && (
        <p className="text-gold-400">
          <span className="mr-2 text-xs uppercase tracking-wide text-gold-600">Coach</span>
          {coachCaption}
        </p>
      )}
      {userCaption && (
        <p className="text-slate-300">
          <span className="mr-2 text-xs uppercase tracking-wide text-slate-500">You</span>
          {userCaption}
        </p>
      )}
      {!coachCaption && !userCaption && <p className="text-slate-500">Captions will appear here.</p>}
    </div>
  );
}
