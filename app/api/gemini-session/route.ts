import { GoogleGenAI, Modality } from "@google/genai";

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

    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: "gemini-3.5-live-translate-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            translationConfig: {
              targetLanguageCode: targetLanguage,
              echoTargetLanguage: true,
            },
          },
        },
      },
    });

    if (!token.name) {
      return Response.json({ error: "لم تُصدر Gemini رمز الجلسة" }, { status: 502 });
    }
    return Response.json({ token: token.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء جلسة Gemini اللحظية";
    return Response.json({ error: message }, { status: 500 });
  }
}
