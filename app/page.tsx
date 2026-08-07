"use client";

import { GoogleGenAI, Modality } from "@google/genai";
import { useEffect, useRef, useState } from "react";

type Direction = "en-ar" | "ar-en";

type GeminiSession = {
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void;
  close(): void;
};

const directionCopy = {
  "en-ar": {
    source: "English", target: "العربية", targetLanguage: "ar",
    sourcePlaceholder: "ابدأ الحديث بالإنجليزية…",
    targetPlaceholder: "ستظهر الترجمة العربية هنا أثناء الكلام",
  },
  "ar-en": {
    source: "العربية", target: "English", targetLanguage: "en",
    sourcePlaceholder: "ابدأ الحديث بالعربية…",
    targetPlaceholder: "The English translation appears here while you speak",
  },
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
  const [direction, setDirection] = useState<Direction>("en-ar");
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState("جاهز للبدء");
  const [error, setError] = useState("");
  const sessionRef = useRef<GeminiSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const copy = directionCopy[direction];

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
    sessionRef.current?.close();
    void inputContextRef.current?.close();
    void outputContextRef.current?.close();
    processorRef.current = null;
    streamRef.current = null;
    sessionRef.current = null;
    inputContextRef.current = null;
    outputContextRef.current = null;
    nextPlayTimeRef.current = 0;
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
      const tokenResponse = await fetch("/api/gemini-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguage: copy.targetLanguage }),
      });
      const tokenData = await tokenResponse.json() as { token?: string; error?: string };
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || "تعذر إنشاء جلسة Gemini");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const outputContext = new AudioContext({ sampleRate: 24000 });
      await outputContext.resume();
      outputContextRef.current = outputContext;

      const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: "v1beta" } });
      const session = await ai.live.connect({
        model: "gemini-3.5-live-translate-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          translationConfig: { targetLanguageCode: copy.targetLanguage, echoTargetLanguage: true },
        },
        callbacks: {
          onopen: () => {
            setConnecting(false);
            setListening(true);
            setStatus("متصل — تحدث الآن");
          },
          onmessage: (message) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) setSourceText((current) => current + content.inputTranscription?.text);
            if (content?.outputTranscription?.text) setTranslatedText((current) => current + content.outputTranscription?.text);
            for (const part of content?.modelTurn?.parts || []) {
              if (part.inlineData?.data) playAudio(part.inlineData.data);
            }
          },
          onerror: (event) => {
            setError(`Gemini: ${event.message || "تعذر تشغيل الترجمة"}`);
            closeSession("تعذر تشغيل الترجمة");
          },
          onclose: (event) => {
            if (listening) setError(`انتهى اتصال Gemini: ${event.reason || "أُغلقت الجلسة"}`);
            closeSession("انتهت الجلسة");
          },
        },
      });
      sessionRef.current = session as GeminiSession;

      const inputContext = new AudioContext({ sampleRate: 16000 });
      await inputContext.resume();
      inputContextRef.current = inputContext;
      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(2048, 1, 1);
      const silent = inputContext.createGain();
      silent.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return;
        sessionRef.current.sendRealtimeInput({
          audio: { data: pcmToBase64(event.inputBuffer.getChannelData(0)), mimeType: "audio/pcm;rate=16000" },
        });
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(inputContext.destination);
      processorRef.current = processor;
    } catch (startError) {
      closeSession("لم تبدأ الترجمة");
      setError(startError instanceof Error ? startError.message : "تعذر تشغيل مترجم Gemini");
    }
  };

  const switchDirection = () => {
    if (listening || connecting) closeSession("تم تغيير اتجاه الترجمة");
    setDirection((current) => current === "en-ar" ? "ar-en" : "en-ar");
    setSourceText(""); setTranslatedText(""); setError("");
  };

  return (
    <main className="app-shell" dir="rtl">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark">↔</span><div><strong>وَصْل</strong><span>ترجمة صوتية لحظية</span></div></div>
        <div className={`live-state ${listening ? "active" : ""}`}><span className="state-dot" />{status}</div>
      </nav>
      <section className="hero">
        <span className="eyebrow">مدعوم بـ Gemini Live Translate</span>
        <h1>تحدّث بلغتك.<br /><em>واسْمَع لغته.</em></h1>
        <p>ترجمة صوتية مباشرة بين العربية والإنجليزية؛ يصل الصوت والنص المترجمان أثناء الحديث.</p>
      </section>
      <section className="translator-card" aria-label="المترجم الصوتي">
        <div className="language-strip">
          <div className="language"><span className="language-code">{direction === "en-ar" ? "EN" : "ع"}</span><div><b>{copy.source}</b><small>لغة المتحدث</small></div></div>
          <button className="swap-button" onClick={switchDirection} disabled={connecting} aria-label="عكس اتجاه الترجمة">⇄</button>
          <div className="language"><span className="language-code target-code">{direction === "en-ar" ? "ع" : "EN"}</span><div><b>{copy.target}</b><small>لغة المستمع</small></div></div>
        </div>
        <div className="conversation-grid">
          <article className={`speech-panel ${listening ? "hearing" : ""}`}>
            <header><span>الكلام المسموع</span><i>{listening ? "بث مباشر" : "في الانتظار"}</i></header>
            <p className={sourceText ? "" : "placeholder"}>{sourceText || copy.sourcePlaceholder}</p>
            <div className="wave">{Array.from({ length: 22 }).map((_, index) => <span key={index} style={{ animationDelay: `${index * 45}ms` }} />)}</div>
          </article>
          <article className="speech-panel translated-panel">
            <header><span>الترجمة المنطوقة</span><i>{translatedText ? "تصل الآن" : "تلقائية"}</i></header>
            <p className={translatedText ? "" : "placeholder"}>{translatedText || copy.targetPlaceholder}</p>
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
        <div><b>ثنائية الاتجاه</b><span>عربية ⇄ إنجليزية</span></div>
        <div><b>صوت ونص</b><span>النتيجة تصل أثناء الحديث</span></div>
      </section>
      <footer>استخدم سماعة لتجنب التقاط الميكروفون لصوت الترجمة وإعادته إلى الجلسة.</footer>
    </main>
  );
}
