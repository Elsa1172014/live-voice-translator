export async function POST(request: Request) {
  try {
    const { targetLanguage } = await request.json() as { targetLanguage?: "ar" | "en" };
    if (!targetLanguage || !["ar", "en"].includes(targetLanguage)) {
      return Response.json({ error: "لغة الترجمة غير صحيحة" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "لم يتم ربط مفتاح OpenAI بالموقع بعد" },
        { status: 503 },
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/translations/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Safety-Identifier": "live-voice-translator-user",
        },
        body: JSON.stringify({
          session: {
            model: "gpt-realtime-translate",
            audio: { output: { language: targetLanguage } },
          },
        }),
      },
    );

    const body = await response.json();
    if (!response.ok) {
      const message = (body as { error?: { message?: string } }).error?.message;
      return Response.json({ error: message || "تعذر إنشاء جلسة الترجمة" }, { status: response.status });
    }
    return Response.json(body);
  } catch {
    return Response.json({ error: "تعذر إنشاء جلسة الترجمة اللحظية" }, { status: 500 });
  }
}
