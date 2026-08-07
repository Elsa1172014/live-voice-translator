export async function POST(request: Request) {
  try {
    const { targetLanguage } = await request.json() as { targetLanguage?: "ar" | "en" };
    if (!targetLanguage || !["ar", "en"].includes(targetLanguage)) {
      return Response.json({ error: "لغة الترجمة غير صحيحة" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "لم يتم ربط مفتاح Gemini بالموقع بعد" }, { status: 503 });
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: "models/gemini-3.5-live-translate-preview",
          config: {
            responseModalities: ["AUDIO"],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            translationConfig: { targetLanguageCode: targetLanguage, echoTargetLanguage: true },
          },
        },
      }),
    });
    const body = await response.json() as { name?: string; error?: { message?: string } };
    if (!response.ok || !body.name) {
      return Response.json({ error: body.error?.message || "تعذر إنشاء جلسة Gemini" }, { status: response.status });
    }
    return Response.json({ token: body.name });
  } catch {
    return Response.json({ error: "تعذر إنشاء جلسة Gemini اللحظية" }, { status: 500 });
  }
}
