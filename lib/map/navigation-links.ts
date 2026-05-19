/** Deep link to Yandex Maps route (auto). */
export function buildYandexMapsRouteUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const rtext = `${fromLat},${fromLng}~${toLat},${toLng}`;
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

/** Deep link to Google Maps directions. */
export function buildGoogleMapsRouteUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${fromLat},${fromLng}`,
    destination: `${toLat},${toLng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
