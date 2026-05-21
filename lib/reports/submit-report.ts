export type SubmitReportParams = {
  photo: File;
  lat: number;
  lng: number;
  notes: string;
  /** Отчёт об уборке зоны (фото должно показывать чистое место) */
  cleanupOf?: string;
};

export type SubmitReportResult =
  | {
      ok: true;
      id: string;
      status: "verified" | "pending" | "rejected";
      message?: string;
    }
  | { ok: false; message: string; rejected?: boolean; offline?: boolean };

export async function submitReport(
  params: SubmitReportParams,
): Promise<SubmitReportResult> {
  const formData = new FormData();
  formData.append("photo", params.photo);
  formData.append("lat", String(params.lat));
  formData.append("lng", String(params.lng));
  formData.append("notes", params.notes);
  if (params.cleanupOf) {
    formData.append("cleanup_of", params.cleanupOf);
  }

  let response: Response;
  try {
    response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, message: "Нет связи с сервером", offline: true };
  }

  const body = (await response.json().catch(() => null)) as {
    id?: string;
    status?: "verified" | "pending" | "rejected";
    message?: string;
    error?: string;
    detail?: string;
  } | null;

  if (!response.ok) {
    const detail = body?.detail ? `: ${body.detail}` : "";
    const rejected = response.status === 422;
    return {
      ok: false,
      message: (body?.error ?? "Не удалось отправить заявку") + detail,
      rejected,
    };
  }

  if (!body?.id) {
    return { ok: false, message: "Сервер не вернул id заявки" };
  }

  return {
    ok: true,
    id: body.id,
    status: body.status ?? "verified",
    message: body.message,
  };
}
