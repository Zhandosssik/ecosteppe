/** 0 = ближайшие, 3 = самые дальние */
export type ProximityTier = 0 | 1 | 2 | 3;

/** Пороги в км: tier 0 < 1.5, tier 1 < 5, tier 2 < 15, tier 3 ≥ 15 */
const THRESHOLDS_KM = [1.5, 5, 15] as const;

export function getProximityTier(distanceKm: number): ProximityTier {
  if (distanceKm < THRESHOLDS_KM[0]) return 0;
  if (distanceKm < THRESHOLDS_KM[1]) return 1;
  if (distanceKm < THRESHOLDS_KM[2]) return 2;
  return 3;
}

/** Tailwind bg-* для списка и UI */
export const PROXIMITY_TIER_BG_CLASS: Record<ProximityTier, string> = {
  0: "bg-[#dc2626]",
  1: "bg-[#ea580c]",
  2: "bg-[#f59e0b]",
  3: "bg-[#9ca3af]",
};
