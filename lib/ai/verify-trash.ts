import { generateGroqVision, generateGroqVisionMulti } from "@/lib/ai/groq-vision";
import type {
  CleanupPairVerificationResult,
  CleanupVerificationResult,
  TrashVerificationResult,
  VerifyCleanupOutcome,
  VerifyCleanupPairOutcome,
  VerifyTrashOutcome,
} from "@/types/ai";

export type { CleanupVerificationResult } from "@/types/ai";

const SYSTEM_PROMPT = `Ты помощник экологического приложения EcoSteppe (Казахстан, степные зоны).
По ОДНОМУ фото определи, есть ли загрязнение, которое человек может убрать.

isHumanMadeWaste = true только при явном бытовом/строительном мусоре: пластик, пакеты, бутылки, банки, обёртки, шины, стройотходы, свалки отходов.

isNaturalObject = true, если главное на снимке — НЕ мусор, а природа: камни, валуны, галька, скалы, песок, глина, сухая трава, ветки на земле естественно, рельеф степи. Такое нельзя «убрать» как мусор.

isTrash = true, если зона требует уборки отходов (обычно isHumanMadeWaste=true).
isTrash = false, если чисто или только природные объекты без отходов.

Не считай мусором: чистый пейзаж, небо, трава, скот, людей без отходов, только асфальт без мусора.

Ответь ТОЛЬКО валидным JSON без markdown:
{"isTrash":boolean,"isHumanMadeWaste":boolean,"isNaturalObject":boolean,"confidence":number,"reason":"кратко по-русски"}`;

const CLEANUP_SYSTEM_PROMPT = `Ты проверяешь отчёт об уборке мусора в EcoSteppe (Казахстан).
Пользователь фотографирует место после уборки.

Проверь:
1. isRealOutdoor — реальная улица/степь/поле (не фон, не экран).
2. isClean — убрана основная часть мусора.

Ответь ТОЛЬКО JSON:
{"isRealOutdoor":boolean,"isClean":boolean,"confidence":number,"reason":"кратко по-русски"}`;

const CLEANUP_PAIR_PROMPT = `Ты проверяешь уборку в EcoSteppe (Казахстан). Даны ДВА фото ОДНОЙ местности:
— первое: ДО уборки;
— второе: ПОСЛЕ уборки.

Оцени:
1. sameLocation — это одно и то же место (ракурс может отличаться)?
2. locationSimilarity — число 0.0–1.0, насколько совпадает место (ландшафт, дорога, горизонт).
3. isRealOutdoor — второе фото снято на улице/в степи.
4. isClean — на втором фото территория убрана.
5. improvementDetected — на втором фото заметно МЕНЬШЕ мусора, чем на первом (или мусора не было).
6. onlyNaturalObject — на ПЕРВОМ фото нет убираемого мусора, только камни/галечник/природный грунт (ошибочная заявка).

Если onlyNaturalObject=true, уборка невозможна — improvementDetected может быть false.

Ответь ТОЛЬКО JSON:
{"sameLocation":boolean,"locationSimilarity":number,"isRealOutdoor":boolean,"isClean":boolean,"improvementDetected":boolean,"onlyNaturalObject":boolean,"confidence":number,"reason":"кратко по-русски"}`;

function parseVerificationJson(text: string): TrashVerificationResult | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      isTrash?: unknown;
      isHumanMadeWaste?: unknown;
      isNaturalObject?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };

    const isHumanMadeWaste = parsed.isHumanMadeWaste === true;
    const isNaturalObject = parsed.isNaturalObject === true;
    const isTrash =
      parsed.isTrash === true || (isHumanMadeWaste && !isNaturalObject);
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : isTrash
        ? 0.7
        : 0.3;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : undefined;

    return { isTrash, isHumanMadeWaste, isNaturalObject, confidence, reason };
  } catch {
    return null;
  }
}

function parseCleanupJson(text: string): CleanupVerificationResult | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      isRealOutdoor?: unknown;
      isClean?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };
    const isRealOutdoor = parsed.isRealOutdoor === true;
    const isClean = parsed.isClean === true;
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : 0.5;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : undefined;
    return { isRealOutdoor, isClean, confidence, reason };
  } catch {
    return null;
  }
}

function parseCleanupPairJson(text: string): CleanupPairVerificationResult | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      sameLocation?: unknown;
      locationSimilarity?: unknown;
      isRealOutdoor?: unknown;
      isClean?: unknown;
      improvementDetected?: unknown;
      onlyNaturalObject?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };

    const sameLocation = parsed.sameLocation === true;
    const similarityRaw = Number(parsed.locationSimilarity);
    const locationSimilarity = Number.isFinite(similarityRaw)
      ? Math.min(1, Math.max(0, similarityRaw))
      : sameLocation
        ? 0.7
        : 0.3;
    const isRealOutdoor = parsed.isRealOutdoor === true;
    const isClean = parsed.isClean === true;
    const improvementDetected = parsed.improvementDetected === true;
    const onlyNaturalObject = parsed.onlyNaturalObject === true;
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : 0.5;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : undefined;

    return {
      sameLocation,
      locationSimilarity,
      isRealOutdoor,
      isClean,
      improvementDetected,
      onlyNaturalObject,
      confidence,
      reason,
    };
  } catch {
    return null;
  }
}

export async function verifyTrashPhoto(
  imageBuffer: Buffer,
  contentType?: string,
): Promise<VerifyTrashOutcome> {
  const vision = await generateGroqVision({
    systemPrompt: SYSTEM_PROMPT,
    userText:
      "Есть ли на фото убираемый человеком мусор? Это камень/природа или реальные отходы?",
    imageBuffer,
    contentType,
  });

  if (!vision.ok) {
    return vision;
  }

  const result = parseVerificationJson(vision.text);
  if (!result) {
    console.error("[verifyTrashPhoto] parse failed:", vision.text);
    return { ok: false, error: "Не удалось разобрать ответ ИИ" };
  }

  return { ok: true, result };
}

export async function verifyCleanupPhoto(
  imageBuffer: Buffer,
  contentType?: string,
): Promise<VerifyCleanupOutcome> {
  const vision = await generateGroqVision({
    systemPrompt: CLEANUP_SYSTEM_PROMPT,
    userText:
      "Проверь фото после уборки. Это реальное место? Мусор убран?",
    imageBuffer,
    contentType,
  });

  if (!vision.ok) {
    return vision;
  }

  const result = parseCleanupJson(vision.text);
  if (!result) {
    console.error("[verifyCleanupPhoto] parse failed:", vision.text);
    return { ok: false, error: "Не удалось разобрать ответ ИИ" };
  }

  return { ok: true, result };
}

export async function verifyCleanupPair(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
  afterContentType?: string,
  beforeContentType?: string,
): Promise<VerifyCleanupPairOutcome> {
  const vision = await generateGroqVisionMulti({
    systemPrompt: CLEANUP_PAIR_PROMPT,
    userText:
      "Сравни фото ДО (первое) и ПОСЛЕ (второе): одно место? стало чище? это не только камень/природа?",
    images: [
      { buffer: beforeBuffer, contentType: beforeContentType },
      { buffer: afterBuffer, contentType: afterContentType },
    ],
    maxTokens: 640,
  });

  if (!vision.ok) {
    return vision;
  }

  const result = parseCleanupPairJson(vision.text);
  if (!result) {
    console.error("[verifyCleanupPair] parse failed:", vision.text);
    return { ok: false, error: "Не удалось разобрать ответ ИИ" };
  }

  return { ok: true, result };
}
