"use client";

import { GoogleGenAI, Modality } from "@google/genai";
import { useEffect, useRef, useState } from "react";

type GeminiSession = {
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void;
  close(): void;
};

function pcmToBase64(samples: Float32Array) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function Home() {
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState("جاهز للبدء");
  const [error, setError] = useState("");
  const sessionsRef = useRef<GeminiSession[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const connectedSessionsRef = useRef(0);
  const noiseFloorRef = useRef(0.008);
  const speechFramesRef = useRef(0);
  const silenceFramesRef = useRef(0);
  const transmittingRef = useRef(false);
  const preRollRef = useRef<string[]>([]);

  const playAudio = (base64Audio: string) => {
    const context = outputContextRef.current;
    if (!context) return;
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    const samples = new Float32Array(Math.floor(bytes.length / 2));
    for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
    const buffer = context.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  };

  const closeSession = (message = "تم إيقاف المحادثة") => {
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    sessionsRef.current.forEach((session) => session.close());
    void inputContextRef.current?.close();
    void outputContextRef.current?.close();
    processorRef.current = null;
    streamRef.current = null;
    sessionsRef.current = [];
    inputContextRef.current = null;
    outputContextRef.current = null;
    nextPlayTimeRef.current = 0;
    connectedSessionsRef.current = 0;
    noiseFloorRef.current = 0.008;
    speechFramesRef.current = 0;
    silenceFramesRef.current = 0;
    transmittingRef.current = false;
    preRollRef.current = [];
    setListening(false);
    setConnecting(false);
    setStatus(message);
  };

  useEffect(() => () => closeSession(""), []);

  const startGeminiTranslation = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setError("هذا المتصفح لا يسمح بالبث الصوتي. افتح الرابط في Safari مباشرة.");
      return;
    }
    setConnecting(true);
    setError("");
    setStatus("يتصل بمترجم Gemini…");
    setSourceText("");
    setTranslatedText("");

    try {
      const createToken = async (targetLanguage: "ar" | "en") => {
        const response = await fetch("/api/gemini-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLanguage }),
        });
        const data = await response.json() as { token?: string; error?: string };
        if (!response.ok || !data.token) throw new Error(data.error || "تعذر إنشاء جلسة Gemini");
        return data.token;
      };
      const [arabicToken, englishToken] = await Promise.all([createToken("ar"), createToken("en")]);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      const outputContext = new AudioContext({ sampleRate: 24000 });
      await outputContext.resume();
      outputContextRef.current = outputContext;

      const connectTranslator = async (token: string, targetLanguage: "ar" | "en") => {
        const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1beta" } });
        return ai.live.connect({
          model: "gemini-3.5-live-translate-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            translationConfig: { targetLanguageCode: targetLanguage, echoTargetLanguage: false },
          },
          callbacks: {
            onopen: () => {
              connectedSessionsRef.current += 1;
              if (connectedSessionsRef.current === 2) {
                setConnecting(false);
                setListening(true);
                setStatus("متصل — اكتشاف اللغة تلقائي");
              }
            },
            onmessage: (message) => {
              const content = message.serverContent;
              if (targetLanguage === "ar" && content?.inputTranscription?.text) {
                setSourceText((current) => current + content.inputTranscription?.text);
              }
              if (content?.outputTranscription?.text) {
                setTranslatedText((current) => current + content.outputTranscription?.text);
              }
              for (const part of content?.modelTurn?.parts || []) {
                if (part.inlineData?.data) playAudio(part.inlineData.data);
              }
            },
            onerror: (event) => {
              setError(`Gemini: ${event.message || "تعذر تشغيل الترجمة"}`);
              closeSession("تعذر تشغيل الترجمة");
            },
            onclose: () => closeSession("انتهت الجلسة"),
          },
        });
      };
      const sessions = await Promise.all([
        connectTranslator(arabicToken, "ar"),
        connectTranslator(englishToken, "en"),
      ]);
      sessionsRef.current = sessions as GeminiSession[];

      const inputContext = new AudioContext({ sampleRate: 16000 });
      await inputContext.resume();
      inputContextRef.current = inputContext;
      const source = inputContext.createMediaStreamSource(stream);
      const highPass = inputContext.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 110;
      highPass.Q.value = 0.7;
      const processor = inputContext.createScriptProcessor(1024, 1, 1);
      const silent = inputContext.createGain();
      silent.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!sessionsRef.current.length) return;
        const samples = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < samples.length; index += 1) energy += samples[index] * samples[index];
        const rms = Math.sqrt(energy / samples.length);
        const threshold = Math.max(0.014, noiseFloorRef.current * 2.8);
        const encoded = pcmToBase64(samples);

        preRollRef.current.push(encoded);
        if (preRollRef.current.length > 3) preRollRef.current.shift();

        if (rms > threshold) {
          speechFramesRef.current += 1;
          silenceFramesRef.current = 0;
          if (!transmittingRef.current && speechFramesRef.current >= 2) {
            transmittingRef.current = true;
            setStatus("صوت بشري مكتشف — يترجم الآن");
            for (const buffered of preRollRef.current) {
              const audio = { data: buffered, mimeType: "audio/pcm;rate=16000" };
              sessionsRef.current.forEach((session) => session.sendRealtimeInput({ audio }));
            }
            preRollRef.current = [];
            return;
          }
        } else {
          speechFramesRef.current = 0;
          if (!transmittingRef.current) {
            noiseFloorRef.current = noiseFloorRef.current * 0.96 + rms * 0.04;
            return;
          }
          silenceFramesRef.current += 1;
        }

        if (transmittingRef.current) {
          const audio = { data: encoded, mimeType: "audio/pcm;rate=16000" };
          sessionsRef.current.forEach((session) => session.sendRealtimeInput({ audio }));
          if (silenceFramesRef.current >= 9) {
            transmittingRef.current = false;
            silenceFramesRef.current = 0;
            setStatus("متصل — ينتظر صوتًا بشريًا");
          }
        }
      };
      source.connect(highPass);
      highPass.connect(processor);
      processor.connect(silent);
      silent.connect(inputContext.destination);
      processorRef.current = processor;
    } catch (startError) {
      closeSession("لم تبدأ الترجمة");
      setError(startError instanceof Error ? startError.message : "تعذر تشغيل مترجم Gemini");
    }
  };

  return (
    <main className="app-shell" dir="rtl">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark">↔</span><div><strong>وَصْل</strong><span>ترجمة صوتية لحظية</span></div></div>
        <div className={`live-state ${listening ? "active" : ""}`}><span className="state-dot" />{status}</div>
      </nav>
      <section className="hero">
        <span className="eyebrow">اكتشاف تلقائي للغة عبر Gemini</span>
        <h1>تحدّث بلغتك.<br /><em>واسْمَع لغته.</em></h1>
        <p>ترجمة صوتية مباشرة بين العربية والإنجليزية؛ يصل الصوت والنص المترجمان أثناء الحديث.</p>
      </section>
      <section className="translator-card" aria-label="المترجم الصوتي">
        <div className="language-strip">
          <div className="language"><span className="language-code">ع</span><div><b>العربية</b><small>تُكتشف تلقائيًا</small></div></div>
          <span className="swap-button" aria-label="ترجمة تلقائية">⇄</span>
          <div className="language"><span className="language-code target-code">EN</span><div><b>English</b><small>تُكتشف تلقائيًا</small></div></div>
        </div>
        <div className="conversation-grid">
          <article className={`speech-panel ${listening ? "hearing" : ""}`}>
            <header><span>الكلام المسموع</span><i>{listening ? "بث مباشر" : "في الانتظار"}</i></header>
            <p className={sourceText ? "" : "placeholder"}>{sourceText || "تحدث بالعربية أو الإنجليزية…"}</p>
            <div className="wave">{Array.from({ length: 22 }).map((_, index) => <span key={index} style={{ animationDelay: `${index * 45}ms` }} />)}</div>
          </article>
          <article className="speech-panel translated-panel">
            <header><span>الترجمة المنطوقة</span><i>{translatedText ? "تصل الآن" : "تلقائية"}</i></header>
            <p className={translatedText ? "" : "placeholder"}>{translatedText || "ستظهر الترجمة إلى اللغة الأخرى هنا"}</p>
            <span className="audio-note">الصوت المترجم يعمل تلقائيًا عبر Gemini</span>
          </article>
        </div>
        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="control-zone">
          <button className={`mic-button ${listening ? "recording" : ""}`} onClick={listening || connecting ? () => closeSession() : startGeminiTranslation} disabled={connecting}>
            <span className="mic-icon">{listening ? "■" : connecting ? "…" : "●"}</span>
            <span>{listening ? "إيقاف المحادثة" : connecting ? "جارٍ الاتصال…" : "ابدأ الترجمة اللحظية"}</span>
          </button>
          <small>على iPhone: افتح الرابط في Safari، واسمح بالميكروفون، وارفع مستوى صوت الهاتف.</small>
        </div>
      </section>
      <section className="promise-row">
        <div><b>Gemini مباشر</b><span>ترجمة صوت إلى صوت</span></div>
        <div><b>اكتشاف تلقائي</b><span>من دون زر تبديل</span></div>
        <div><b>صوت ونص</b><span>النتيجة تصل أثناء الحديث</span></div>
      </section>
      <footer>استخدم سماعة لتجنب التقاط الميكروفون لصوت الترجمة وإعادته إلى الجلسة.</footer>
    </main>
  );
}
