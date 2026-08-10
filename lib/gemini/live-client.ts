import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { LIVE_TOOLS, type ToolName } from './tools';

export type CoachStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'error';

export interface LiveClientCallbacks {
  onStatusChange: (status: CoachStatus) => void;
  onInputTranscript: (text: string, isFinal: boolean) => void;
  onOutputTranscript: (text: string, isFinal: boolean) => void;
  onToolCall: (name: ToolName, args: Record<string, any>) => Promise<any>;
  onError: (message: string) => void;
  onInterrupted: () => void;
}

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

/**
 * Wraps @google/genai's Live session with:
 *  - continuous small-chunk PCM streaming (low latency, no waiting for
 *    a full utterance)
 *  - server-side VAD (Gemini decides turn boundaries; short thinking
 *    pauses are not treated as "done")
 *  - barge-in: as soon as the user speaks, playback is stopped and
 *    queued audio discarded
 *  - automatic reconnection with a short context-resumption summary
 *    so the coach never repeats its last line after a drop
 */
export class LiveCoachClient {
  private ai: GoogleGenAI | null = null;
  private session: Session | null = null;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: ScriptProcessorNode | null = null;
  private playbackContext: AudioContext | null = null;
  private playbackQueue: AudioBufferSourceNode[] = [];
  private nextPlaybackTime = 0;
  private muted = false;
  private lastAssistantUtterance = '';
  private reconnectAttempts = 0;
  private sessionHandle: string | null = null;

  constructor(
    private getEphemeralToken: () => Promise<{ token: string; model: string; mock: boolean }>,
    private systemInstruction: string,
    private callbacks: LiveClientCallbacks,
    private silenceTimeoutMs: number = 1200
  ) {}

  async connect() {
    this.callbacks.onStatusChange('connecting');
    try {
      const { token, model, mock } = await this.getEphemeralToken();

      if (mock) {
        this.callbacks.onStatusChange('listening');
        this.callbacks.onError('MOCK_MODE'); // hook consumer decides how to surface this
        return;
      }

      this.ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

      this.session = await this.ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: this.systemInstruction }] },
          tools: LIVE_TOOLS as any,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              silenceDurationMs: this.silenceTimeoutMs,
            },
          },
          contextWindowCompression: { slidingWindow: {} },
          sessionResumption: this.sessionHandle ? { handle: this.sessionHandle } : {},
        },
        callbacks: {
          onopen: () => {
            this.reconnectAttempts = 0;
            this.callbacks.onStatusChange('listening');
          },
          onmessage: (msg: LiveServerMessage) => this.handleServerMessage(msg),
          onerror: (e: any) => {
            console.error('Live session error', e);
            this.callbacks.onError('Connection error.');
          },
          onclose: (e: any) => {
            if (!e?.wasClean) this.attemptReconnect();
          },
        },
      });

      await this.startMic();
    } catch (err) {
      console.error(err);
      this.callbacks.onStatusChange('error');
      this.callbacks.onError('Could not start the voice session.');
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= 5) {
      this.callbacks.onStatusChange('error');
      this.callbacks.onError('Lost connection. Please restart the session.');
      return;
    }
    this.reconnectAttempts += 1;
    this.callbacks.onStatusChange('reconnecting');
    const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
    await new Promise((r) => setTimeout(r, backoff));
    await this.connect();
  }

  private handleServerMessage(msg: LiveServerMessage) {
    // Barge-in: server tells us the user started talking over the coach.
    if (msg.serverContent?.interrupted) {
      this.flushPlayback();
      this.callbacks.onInterrupted();
      this.callbacks.onStatusChange('listening');
      return;
    }

    if (msg.serverContent?.inputTranscription?.text) {
      this.callbacks.onInputTranscript(msg.serverContent.inputTranscription.text, !!msg.serverContent.turnComplete);
    }

    if (msg.serverContent?.outputTranscription?.text) {
      this.lastAssistantUtterance += msg.serverContent.outputTranscription.text;
      this.callbacks.onOutputTranscript(this.lastAssistantUtterance, !!msg.serverContent.turnComplete);
    }

    const audioPart = msg.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith('audio/'));
    if (audioPart?.inlineData?.data) {
      this.callbacks.onStatusChange('speaking');
      this.playAudioChunk(audioPart.inlineData.data);
    }

    if (msg.serverContent?.turnComplete) {
      this.lastAssistantUtterance = '';
      this.callbacks.onStatusChange('listening');
    }

    if (msg.sessionResumptionUpdate?.resumable && msg.sessionResumptionUpdate?.newHandle) {
      this.sessionHandle = msg.sessionResumptionUpdate.newHandle;
    }

    if (msg.toolCall?.functionCalls?.length) {
      this.callbacks.onStatusChange('thinking');
      this.handleToolCalls(msg.toolCall.functionCalls);
    }
  }

  private async handleToolCalls(calls: Array<{ id?: string; name?: string; args?: Record<string, any> }>) {
    const responses = await Promise.all(
      calls.map(async (call) => {
        const name = (call.name ?? '') as ToolName;
        const result = await this.callbacks.onToolCall(name, call.args ?? {});
        return { id: call.id, name: call.name, response: { result } };
      })
    );
    this.session?.sendToolResponse({ functionResponses: responses });
  }

  private async startMic() {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: INPUT_SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
    });

    this.audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    const source = this.audioContext.createMediaStreamSource(this.micStream);

    // ScriptProcessorNode is deprecated but has the widest, most reliable
    // support today for raw PCM access; swap for AudioWorklet if you need
    // to drop legacy Safari support.
    this.workletNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.workletNode.onaudioprocess = (event) => {
      if (this.muted || !this.session) return;
      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(input);
      this.session.sendRealtimeInput({
        audio: { data: base64FromArrayBuffer(pcm16.buffer), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
      });
    };

    // The processor node must be connected to a destination for
    // onaudioprocess to fire, but we don't want to hear our own mic —
    // route it through a silent (zero-gain) sink instead of the speakers.
    source.connect(this.workletNode);
    this.workletNode.connect(this.silentSink());
  }

  private silentSink(): AudioNode {
    const gain = this.audioContext!.createGain();
    gain.gain.value = 0;
    gain.connect(this.audioContext!.destination);
    return gain;
  }

  private ensurePlaybackContext() {
    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      this.nextPlaybackTime = this.playbackContext.currentTime;
    }
    return this.playbackContext;
  }

  private playAudioChunk(base64Data: string) {
    const ctx = this.ensurePlaybackContext();
    const bytes = base64ToArrayBuffer(base64Data);
    const pcm16 = new Int16Array(bytes);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(this.nextPlaybackTime, ctx.currentTime);
    source.start(startAt);
    this.nextPlaybackTime = startAt + buffer.duration;
    this.playbackQueue.push(source);
    source.onended = () => {
      this.playbackQueue = this.playbackQueue.filter((s) => s !== source);
    };
  }

  private flushPlayback() {
    this.playbackQueue.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.playbackQueue = [];
    if (this.playbackContext) this.nextPlaybackTime = this.playbackContext.currentTime;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  sendTextNudge(text: string) {
    // Used by UI buttons like "Please repeat" / "Speak more slowly" —
    // sent as a normal user turn so the coach reacts naturally.
    this.session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
  }

  disconnect() {
    this.workletNode?.disconnect();
    this.audioContext?.close();
    this.playbackContext?.close();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.session?.close();
    this.session = null;
  }
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function base64FromArrayBuffer(buffer: ArrayBufferLike): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer.slice(0) as ArrayBuffer;
}
