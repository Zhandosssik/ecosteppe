export type GeoErrorCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeoResult =
  | { ok: true; position: GeoPosition }
  | { ok: false; code: GeoErrorCode; message: string };

const ERROR_MESSAGES: Record<GeoErrorCode, string> = {
  unsupported: "Геолокация не поддерживается в этом браузере",
  denied: "Разрешите доступ к геолокации в настройках браузера",
  unavailable: "Не удалось определить местоположение",
  timeout: "Превышено время ожидания GPS",
  unknown: "Ошибка определения местоположения",
};

function mapGeoError(error: GeolocationPositionError): GeoResult {
  const codeMap: Record<number, GeoErrorCode> = {
    1: "denied",
    2: "unavailable",
    3: "timeout",
  };
  const code = codeMap[error.code] ?? "unknown";
  return { ok: false, code, message: ERROR_MESSAGES[code] };
}

export function getUserPosition(): Promise<GeoResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      code: "unsupported",
      message: ERROR_MESSAGES.unsupported,
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => resolve(mapGeoError(error)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
