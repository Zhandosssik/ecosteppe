export function formatDistanceKm(km: number): string {
  if (km < 1) {
    const meters = Math.max(1, Math.round(km * 1000));
    return `${meters} м`;
  }
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}
