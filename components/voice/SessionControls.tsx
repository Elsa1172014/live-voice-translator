'use client';

import { useState } from 'react';
import { Mic, MicOff, HelpCircle, Repeat, Gauge, Languages, RefreshCw, PhoneOff, MessageSquareQuote } from 'lucide-react';

interface SessionControlsProps {
  onMuteToggle: (muted: boolean) => void;
  onNudge: (text: string) => void;
  onChangeTopic: () => void;
  onEndSession: () => void;
  onShowLastCorrection: () => void;
  arabicAllowed: boolean;
}

export function SessionControls({
  onMuteToggle,
  onNudge,
  onChangeTopic,
  onEndSession,
  onShowLastCorrection,
  arabicAllowed,
}: SessionControlsProps) {
  const [muted, setMuted] = useState(false);
  const [confirmArabic, setConfirmArabic] = useState(false);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    onMuteToggle(next);
  }

  function requestArabic() {
    if (!confirmArabic) {
      setConfirmArabic(true);
      setTimeout(() => setConfirmArabic(false), 4000);
      return;
    }
    onNudge('Can you please explain that briefly in Arabic? I still do not understand.');
    setConfirmArabic(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button onClick={toggleMute} className="btn-secondary" aria-pressed={muted}>
        {muted ? <MicOff size={16} /> : <Mic size={16} />}
        {muted ? 'Unmute' : 'Mute'}
      </button>

      <button onClick={() => onNudge('I need a little help, please.')} className="btn-ghost">
        <HelpCircle size={16} /> I need help
      </button>

      <button onClick={() => onNudge('Could you explain that more simply, please?')} className="btn-ghost">
        <MessageSquareQuote size={16} /> Explain more simply
      </button>

      <button onClick={() => onNudge('Please repeat that.')} className="btn-ghost">
        <Repeat size={16} /> Please repeat
      </button>

      <button onClick={() => onNudge('Could you speak more slowly, please?')} className="btn-ghost">
        <Gauge size={16} /> Speak more slowly
      </button>

      <button onClick={onShowLastCorrection} className="btn-ghost">
        Last correction
      </button>

      {arabicAllowed && (
        <button onClick={requestArabic} className="btn-ghost">
          <Languages size={16} /> {confirmArabic ? 'Tap again to confirm' : 'Explain in Arabic'}
        </button>
      )}

      <button onClick={onChangeTopic} className="btn-ghost">
        <RefreshCw size={16} /> Change topic
      </button>

      <button onClick={onEndSession} className="btn-secondary text-red-400 hover:bg-red-500/10">
        <PhoneOff size={16} /> End session
      </button>
    </div>
  );
}
