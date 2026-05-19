export function formatRouteDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.max(1, Math.round(meters))} м`;
  }
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

export function formatRouteDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `~${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `~${hours} ч`;
  return `~${hours} ч ${minutes} мин`;
}
