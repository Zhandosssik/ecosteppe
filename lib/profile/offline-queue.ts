const STORAGE_KEY = "ecosteppe-offline-reports";

export type OfflineReportDraft = {
  id: string;
  createdAt: string;
  lat: number;
  lng: number;
  notes: string;
  photoDataUrl: string;
};

function readAll(): OfflineReportDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineReportDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: OfflineReportDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getOfflineReportQueue(): OfflineReportDraft[] {
  return readAll();
}

export function getOfflineQueueCount(): number {
  return readAll().length;
}

export function enqueueOfflineReport(
  draft: Omit<OfflineReportDraft, "id" | "createdAt"> & { id?: string },
): OfflineReportDraft {
  const entry: OfflineReportDraft = {
    id: draft.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    lat: draft.lat,
    lng: draft.lng,
    notes: draft.notes,
    photoDataUrl: draft.photoDataUrl,
  };
  writeAll([...readAll(), entry]);
  return entry;
}

export function removeOfflineReport(id: string) {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function dataUrlToFile(dataUrl: string, id: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime =
    header?.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const ext = mime.includes("png") ? "png" : "jpg";
  return new File([bytes], `offline-${id}.${ext}`, { type: mime });
}
