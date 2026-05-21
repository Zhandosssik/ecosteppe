import { haversineKm } from "@/lib/geo/haversine";
import type { NearbyReport, ReportRow } from "@/types/report";

/** Сколько ближайших заявок отдаём клиенту (меньше нагрузка на карту и сеть) */
export const NEARBY_REPORTS_LIMIT = 80;

export function withDistanceSorted(
  reports: ReportRow[],
  userLat: number,
  userLng: number,
  limit = NEARBY_REPORTS_LIMIT,
): NearbyReport[] {
  return reports
    .map((report) => ({
      ...report,
      distance_km: haversineKm(userLat, userLng, report.lat, report.lng),
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
