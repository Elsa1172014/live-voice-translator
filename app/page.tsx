"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "en-ar" | "ar-en";

type TranslationEvent = {
  type?: string;
  delta?: string;
  error?: { message?: string };
};

const directionCopy = {
  "en-ar": {
    source: "English",
    target: "العربية",
    targetLanguage: "ar",
    sourcePlaceholder: "ابدأ الحديث بالإنجليزية…",
    targetPlaceholder: "ستظهر الترجمة العربية هنا أثناء الكلام",
  },
  "ar-en": {
    source: "العربية",
    target: "English",
    targetLanguage: "en",
    sourcePlaceholder: "ابدأ الحديث بالعربية…",
    targetPlaceholder: "The English translation appears here while you speak",
  },
};

export default function Home() {
  const [direction, setDirection] = useState<Direction>("en-ar");
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState("جاهز للبدء");
  const [error, setError] = useState("");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const inputBufferRef = useRef("");
  const outputBufferRef = useRef("");
  const copy = directionCopy[direction];

  const closeSession = (message = "تم إيقاف المحادثة") => {
    dataChannelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove();
    }
    dataChannelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setListening(false);
    setConnecting(false);
    setStatus(message);
  };

  useEffect(() => () => closeSession(""), []);

  const handleRealtimeEvent = (event: TranslationEvent) => {
    if (event.type === "session.input_transcript.delta" && event.delta) {
      inputBufferRef.current += event.delta;
      setSourceText(inputBufferRef.current);
    }
    if (event.type === "session.output_transcript.delta" && event.delta) {
      outputBufferRef.current += event.delta;
      setTranslatedText(outputBufferRef.current);
    }
    if (event.type === "session.input_transcript.done") {
      inputBufferRef.current += "\n";
    }
    if (event.type === "session.output_transcript.done") {
      outputBufferRef.current += "\n";
    }
    if (event.type === "error") {
      setError(event.error?.message || "حدث خطأ في جلسة الترجمة");
      closeSession("تعذر تشغيل الترجمة");
    }
  };

  const startRealtimeTranslation = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError("هذا المتصفح لا يسمح بالبث الصوتي. افتح الرابط في Safari مباشرة.");
      return;
    }

    setConnecting(true);
    setError("");
    setStatus("يتصل بالمترجم…");
    setSourceText("");
    setTranslatedText("");
    inputBufferRef.current = "";
    outputBufferRef.current = "";

    try {
      const tokenResponse = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguage: copy.targetLanguage }),
      });
      const tokenData = await tokenResponse.json() as { value?: string; error?: string };
      if (!tokenResponse.ok || !tokenData.value) {
        throw new Error(tokenData.error || "خدمة الترجمة اللحظية غير مفعّلة");
      }

      const sourceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = sourceStream;

      const translatedAudio = document.createElement("audio");
      translatedAudio.autoplay = true;
      translatedAudio.setAttribute("playsinline", "true");
      document.body.appendChild(translatedAudio);
      audioRef.current = translatedAudio;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      peer.addTrack(sourceStream.getAudioTracks()[0], sourceStream);
      peer.ontrack = ({ streams }) => {
        translatedAudio.srcObject = streams[0];
        translatedAudio.play().catch(() => {
          setError("اضغط زر التشغيل في الهاتف للسماح بخروج الصوت المترجم.");
        });
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
          setConnecting(false);
          setListening(true);
          setStatus("متصل — تحدث الآن");
        }
        if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
          closeSession("انقطع الاتصال");
        }
      };

      const events = peer.createDataChannel("oai-events");
      dataChannelRef.current = events;
      events.onmessage = ({ data }) => {
        try { handleRealtimeEvent(JSON.parse(data)); } catch { /* ignore malformed event */ }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/translations/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      const sdpBody = await sdpResponse.text();
      if (!sdpResponse.ok) {
        let detail = sdpBody;
        try {
          const parsed = JSON.parse(sdpBody) as { error?: { message?: string } };
          detail = parsed.error?.message || sdpBody;
        } catch { /* keep raw error text */ }
        throw new Error(`OpenAI: ${detail || "فشل إنشاء الاتصال الصوتي اللحظي"}`);
      }
      await peer.setRemoteDescription({ type: "answer", sdp: sdpBody });
    } catch (startError) {
      closeSession("لم تبدأ الترجمة");
      setError(startError instanceof Error ? startError.message : "تعذر تشغيل المترجم");
    }
  };

  const switchDirection = () => {
    if (listening || connecting) closeSession("تم تغيير اتجاه الترجمة");
    setDirection((current) => current === "en-ar" ? "ar-en" : "en-ar");
    setSourceText("");
    setTranslatedText("");
    setError("");
  };

  return (
    <main className="app-shell" dir="rtl">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark">↔</span><div><strong>وَصْل</strong><span>ترجمة صوتية لحظية</span></div></div>
        <div className={`live-state ${listening ? "active" : ""}`}><span className="state-dot" />{status}</div>
      </nav>

      <section className="hero">
        <span className="eyebrow">حوار بلا حواجز</span>
        <h1>تحدّث بلغتك.<br /><em>واسْمَع لغته.</em></h1>
        <p>ترجمة صوتية مباشرة عبر اتصال WebRTC؛ يُرسل صوت الميكروفون وتعود الترجمة صوتًا ونصًا أثناء الحديث.</p>
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
            <span className="audio-note">الصوت المترجم يعمل تلقائيًا عبر الاتصال المباشر</span>
          </article>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="control-zone">
          <button
            className={`mic-button ${listening ? "recording" : ""}`}
            onClick={listening || connecting ? () => closeSession() : startRealtimeTranslation}
            disabled={connecting}
          >
            <span className="mic-icon">{listening ? "■" : connecting ? "…" : "●"}</span>
            <span>{listening ? "إيقاف المحادثة" : connecting ? "جارٍ الاتصال…" : "ابدأ الترجمة اللحظية"}</span>
          </button>
          <small>على iPhone: افتح الرابط في Safari، واسمح بالميكروفون، وارفع مستوى صوت الهاتف.</small>
        </div>
      </section>

      <section className="promise-row">
        <div><b>WebRTC مباشر</b><span>لا تسجيل ولا رفع ملفات</span></div>
        <div><b>ثنائية الاتجاه</b><span>عربية ⇄ إنجليزية</span></div>
        <div><b>صوت ونص</b><span>النتيجة تصل أثناء الحديث</span></div>
      </section>
      <footer>استخدم سماعة لتجنب التقاط الميكروفون لصوت الترجمة وإعادته إلى الجلسة.</footer>
    </main>
  );
}
