import type { MapRoute } from "@/types/map-route";

type FetchRouteParams = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  reportId: string;
};

type FetchRouteResult =
  | { ok: true; route: MapRoute }
  | { ok: false; message: string };

export async function fetchRouteToReport(
  params: FetchRouteParams,
): Promise<FetchRouteResult> {
  const { fromLat, fromLng, toLat, toLng, reportId } = params;

  const query = new URLSearchParams({
    fromLat: String(fromLat),
    fromLng: String(fromLng),
    toLat: String(toLat),
    toLng: String(toLng),
  });

  let response: Response;
  try {
    response = await fetch(`/api/route?${query.toString()}`);
  } catch {
    return { ok: false, message: "Нет связи с сервером. Проверьте интернет." };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: body?.error ?? "Не удалось построить маршрут",
    };
  }

  const data = (await response.json()) as {
    positions: [number, number][];
    distanceM: number;
    durationS: number;
  };

  if (!data.positions?.length) {
    return { ok: false, message: "Маршрут не найден для этих координат" };
  }

  return {
    ok: true,
    route: {
      reportId,
      positions: data.positions,
      distanceM: data.distanceM,
      durationS: data.durationS,
    },
  };
}
