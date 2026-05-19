import { NextResponse } from "next/server";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function parseCoord(value: string | null, name: string): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (name.includes("Lat") && (n < -90 || n > 90)) return null;
  if (name.includes("Lng") && (n < -180 || n > 180)) return null;
  return n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromLat = parseCoord(searchParams.get("fromLat"), "fromLat");
  const fromLng = parseCoord(searchParams.get("fromLng"), "fromLng");
  const toLat = parseCoord(searchParams.get("toLat"), "toLat");
  const toLng = parseCoord(searchParams.get("toLng"), "toLng");

  if (
    fromLat == null ||
    fromLng == null ||
    toLat == null ||
    toLng == null
  ) {
    return NextResponse.json(
      { error: "Некорректные координаты" },
      { status: 400 },
    );
  }

  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  let osrmResponse: Response;
  try {
    osrmResponse = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { error: "Сервис маршрутов недоступен" },
      { status: 502 },
    );
  }

  if (!osrmResponse.ok) {
    return NextResponse.json(
      { error: "Сервис маршрутов вернул ошибку" },
      { status: 502 },
    );
  }

  const osrm = (await osrmResponse.json()) as {
    code?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };

  if (osrm.code !== "Ok" || !osrm.routes?.[0]) {
    return NextResponse.json(
      { error: "Маршрут не найден" },
      { status: 404 },
    );
  }

  const route = osrm.routes[0];
  const coords = route.geometry?.coordinates;

  if (!coords?.length) {
    return NextResponse.json(
      { error: "Пустая геометрия маршрута" },
      { status: 404 },
    );
  }

  const positions: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);

  return NextResponse.json({
    positions,
    distanceM: route.distance,
    durationS: route.duration,
  });
}
