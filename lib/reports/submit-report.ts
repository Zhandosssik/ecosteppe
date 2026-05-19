export type SubmitReportParams = {
  photo: File;
  lat: number;
  lng: number;
  notes: string;
};

export type SubmitReportResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function submitReport(
  params: SubmitReportParams,
): Promise<SubmitReportResult> {
  const formData = new FormData();
  formData.append("photo", params.photo);
  formData.append("lat", String(params.lat));
  formData.append("lng", String(params.lng));
  formData.append("notes", params.notes);

  let response: Response;
  try {
    response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, message: "Нет связи с сервером" };
  }

  const body = (await response.json().catch(() => null)) as {
    id?: string;
    error?: string;
    detail?: string;
  } | null;

  if (!response.ok) {
    const detail = body?.detail ? `: ${body.detail}` : "";
    return {
      ok: false,
      message: (body?.error ?? "Не удалось отправить заявку") + detail,
    };
  }

  if (!body?.id) {
    return { ok: false, message: "Сервер не вернул id заявки" };
  }

  return { ok: true, id: body.id };
}
