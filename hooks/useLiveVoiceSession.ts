'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveCoachClient, type CoachStatus } from '@/lib/gemini/live-client';
import type { ToolName } from '@/lib/gemini/tools';

interface UseLiveVoiceSessionArgs {
  sessionId: string;
  systemInstruction: string;
  silenceTimeoutMs?: number;
}

export function useLiveVoiceSession({ sessionId, systemInstruction, silenceTimeoutMs }: UseLiveVoiceSessionArgs) {
  const [status, setStatus] = useState<CoachStatus>('idle');
  const [isMock, setIsMock] = useState(false);
  const [userCaption, setUserCaption] = useState('');
  const [coachCaption, setCoachCaption] = useState('');
  const [lastCorrection, setLastCorrection] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientRef = useRef<LiveCoachClient | null>(null);

  const persistTurn = useCallback(
    async (speaker: 'user' | 'coach', transcript: string) => {
      if (!transcript.trim()) return;
      await fetch('/api/conversation-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, speaker, transcript }),
      });
    },
    [sessionId]
  );

  const dispatchTool = useCallback(
    async (name: ToolName, args: Record<string, any>) => {
      if (name === 'save_language_error') {
        setLastCorrection(`${args.original_text} → ${args.corrected_text}`);
      }
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, args, sessionId }),
      });
      if (!res.ok) return { ok: false };
      return res.json();
    },
    [sessionId]
  );

  const getEphemeralToken = useCallback(async () => {
    const res = await fetch('/api/gemini/token', { method: 'POST' });
    const data = await res.json();
    if (data.mock) return { token: '', model: '', mock: true };
    if (!res.ok) throw new Error(data.error || 'Token request failed');
    return { token: data.token, model: data.model, mock: false };
  }, []);

  const start = useCallback(() => {
    const client = new LiveCoachClient(
      getEphemeralToken,
      systemInstruction,
      {
        onStatusChange: setStatus,
        onInputTranscript: (text, isFinal) => {
          setUserCaption(text);
          if (isFinal) persistTurn('user', text);
        },
        onOutputTranscript: (text, isFinal) => {
          setCoachCaption(text);
          if (isFinal) persistTurn('coach', text);
        },
        onToolCall: dispatchTool,
        onError: (msg) => {
          if (msg === 'MOCK_MODE') {
            setIsMock(true);
            return;
          }
          setErrorMessage(msg);
        },
        onInterrupted: () => setCoachCaption(''),
      },
      silenceTimeoutMs
    );
    clientRef.current = client;
    client.connect();
  }, [systemInstruction, getEphemeralToken, dispatchTool, persistTurn, silenceTimeoutMs]);

  const stop = useCallback(async () => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    await dispatchTool('finish_session', {});
    setStatus('idle');
  }, [dispatchTool]);

  const setMuted = useCallback((muted: boolean) => clientRef.current?.setMuted(muted), []);

  const sendNudge = useCallback((text: string) => clientRef.current?.sendTextNudge(text), []);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    status,
    isMock,
    userCaption,
    coachCaption,
    lastCorrection,
    errorMessage,
    start,
    stop,
    setMuted,
    sendNudge,
  };
}
