const FETCH_TIMEOUT_MS = 15_000;

export async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return null;

    return { buffer, contentType };
  } catch (err) {
    console.error("[fetchImageBuffer]", url, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
