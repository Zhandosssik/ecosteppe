export function getGroqApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || null;
}

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

/** Vision-модель Groq (Llama 4 Scout) */
export function getGroqVisionModel(): string {
  return (
    process.env.GROQ_VISION_MODEL?.trim() ||
    "meta-llama/llama-4-scout-17b-16e-instruct"
  );
}

/** Минимальная уверенность ИИ для публикации заявки о загрязнении */
export function getTrashConfidenceThreshold(): number {
  const raw = process.env.GROQ_TRASH_CONFIDENCE_THRESHOLD;
  if (!raw) return 0.55;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.55;
}

/** Минимальное сходство места «до» и «после» при завершении уборки */
export function getCleanupLocationSimilarityMin(): number {
  const raw = process.env.GROQ_CLEANUP_LOCATION_SIMILARITY_MIN;
  if (!raw) return 0.42;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.42;
}
