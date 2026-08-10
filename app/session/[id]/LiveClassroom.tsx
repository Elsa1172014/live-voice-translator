'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveVoiceSession } from '@/hooks/useLiveVoiceSession';
import { VoiceOrb } from '@/components/voice/VoiceOrb';
import { CaptionBar } from '@/components/voice/CaptionBar';
import { ConnectionStatus } from '@/components/voice/ConnectionStatus';
import { SessionControls } from '@/components/voice/SessionControls';

interface LiveClassroomProps {
  sessionId: string;
  topicLabel: string;
  systemInstruction: string;
  captionVisibility: 'hidden' | 'on_correction' | 'always';
  silenceTimeoutMs: number;
  arabicAllowed: boolean;
}

export function LiveClassroom({
  sessionId, topicLabel, systemInstruction, captionVisibility, silenceTimeoutMs, arabicAllowed,
}: LiveClassroomProps) {
  const router = useRouter();
  const {
    status, isMock, userCaption, coachCaption, lastCorrection, errorMessage, start, stop, setMuted, sendNudge,
  } = useLiveVoiceSession({ sessionId, systemInstruction, silenceTimeoutMs });

  const [captionsOn, setCaptionsOn] = useState(captionVisibility === 'always');
  const [showCorrectionToast, setShowCorrectionToast] = useState(false);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alwaysOn = captionVisibility === 'always';
    if (lastCorrection && captionVisibility === 'on_correction') {
      setCaptionsOn(true);
      const t = setTimeout(() => setCaptionsOn(alwaysOn), 6000);
      return () => clearTimeout(t);
    }
  }, [lastCorrection, captionVisibility]);

  async function handleEnd() {
    await stop();
    router.push(`/session/${sessionId}/report`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-between px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Topic</p>
          <p className="font-medium text-slate-100">{topicLabel.replace(/_/g, ' ')}</p>
        </div>
        <ConnectionStatus status={status} />
      </div>

      {isMock && (
        <div className="mt-4 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Running in Mock Mode — no GEMINI_API_KEY configured on the server. Add it to unlock live voice.
        </div>
      )}
      {errorMessage && errorMessage !== 'MOCK_MODE' && (
        <div className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
        <VoiceOrb status={status} />
        <CaptionBar userCaption={userCaption} coachCaption={coachCaption} visible={captionsOn} />
        <button onClick={() => setCaptionsOn((v) => !v)} className="btn-ghost text-xs">
          {captionsOn ? 'Hide captions' : 'Show captions'}
        </button>
      </div>

      <SessionControls
        onMuteToggle={setMuted}
        onNudge={sendNudge}
        onChangeTopic={() => sendNudge('I would like to change the topic, please.')}
        onEndSession={handleEnd}
        onShowLastCorrection={() => setShowCorrectionToast(true)}
        arabicAllowed={arabicAllowed}
      />

      {showCorrectionToast && (
        <div
          onClick={() => setShowCorrectionToast(false)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 cursor-pointer rounded-lg border border-gold-500/30 bg-navy-900 px-4 py-2 text-sm text-gold-400 shadow-xl"
        >
          {lastCorrection ?? 'No correction logged yet.'}
        </div>
      )}
    </main>
  );
}
