export type DismissNaturalResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function dismissReportAsNatural(
  reportId: string,
): Promise<DismissNaturalResult> {
  let response: Response;
  try {
    response = await fetch(`/api/reports/${reportId}/dismiss-natural`, {
      method: "POST",
    });
  } catch {
    return { ok: false, message: "Нет связи с сервером" };
  }

  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    return { ok: false, message: body?.error ?? "Не удалось снять заявку" };
  }

  return {
    ok: true,
    message:
      body?.message ??
      "Заявка снята — это природный объект, уборка не нужна.",
  };
}
