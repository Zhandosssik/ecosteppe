import {
  getGroqApiKey,
  getGroqVisionModel,
  isGroqConfigured,
} from "@/lib/ai/env";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

export type GroqVisionOutcome =
  | { ok: true; text: string }
  | { ok: false; error: string };

function mimeForBuffer(contentType: string | undefined): string {
  if (contentType?.includes("png")) return "image/png";
  if (contentType?.includes("webp")) return "image/webp";
  return "image/jpeg";
}

function imagePart(buffer: Buffer, contentType?: string) {
  const mime = mimeForBuffer(contentType);
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  return {
    type: "image_url" as const,
    image_url: { url: dataUrl },
  };
}

export async function generateGroqVision(params: {
  systemPrompt: string;
  userText: string;
  imageBuffer: Buffer;
  contentType?: string;
  maxTokens?: number;
}): Promise<GroqVisionOutcome> {
  return generateGroqVisionMulti({
    systemPrompt: params.systemPrompt,
    userText: params.userText,
    images: [{ buffer: params.imageBuffer, contentType: params.contentType }],
    maxTokens: params.maxTokens,
  });
}

export async function generateGroqVisionMulti(params: {
  systemPrompt: string;
  userText: string;
  images: Array<{ buffer: Buffer; contentType?: string }>;
  maxTokens?: number;
}): Promise<GroqVisionOutcome> {
  if (!isGroqConfigured()) {
    return { ok: false, error: "GROQ_API_KEY не настроен" };
  }

  if (params.images.length === 0) {
    return { ok: false, error: "Нет изображений для анализа" };
  }

  const model = getGroqVisionModel();
  const apiKey = getGroqApiKey()!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: params.maxTokens ?? 512,
        messages: [
          { role: "system", content: params.systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: params.userText },
              ...params.images.map((img) => imagePart(img.buffer, img.contentType)),
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[groq-vision]", response.status, errText);
      if (response.status === 429) {
        return {
          ok: false,
          error:
            "Лимит Groq API (слишком много запросов). Подождите 1–2 минуты и повторите.",
        };
      }
      if (
        response.status === 401 ||
        (response.status === 400 &&
          /invalid.*api key|invalid_api_key|authentication/i.test(errText))
      ) {
        return {
          ok: false,
          error:
            "Неверный ключ Groq. В .env укажите GROQ_API_KEY с https://console.groq.com (начинается с gsk_).",
        };
      }
      return {
        ok: false,
        error: `Ошибка Groq API (${response.status})`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return { ok: false, error: "Пустой ответ от Groq" };
    }

    return { ok: true, text: content.trim() };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Превышено время ожидания проверки фото" };
    }
    console.error("[groq-vision]", err);
    return { ok: false, error: "Сбой при обращении к Groq" };
  } finally {
    clearTimeout(timeout);
  }
}
