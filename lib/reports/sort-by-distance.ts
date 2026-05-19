import { haversineKm } from "@/lib/geo/haversine";
import type { NearbyReport, ReportRow } from "@/types/report";

export function withDistanceSorted(
  reports: ReportRow[],
  userLat: number,
  userLng: number,
): NearbyReport[] {
  return reports
    .map((report) => ({
      ...report,
      distance_km: haversineKm(userLat, userLng, report.lat, report.lng),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}
