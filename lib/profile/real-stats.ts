import type { SupabaseClient } from "@supabase/supabase-js";
import { isPublicZoneReport } from "@/lib/reports/is-cleanup-proof";
import type { ProfileStats } from "@/types/profile";

export const XP_PER_VERIFIED_REPORT = 50;

/** XP только из подтверждённых отчётов с привязкой user_id */
export function xpFromVerifiedCount(verifiedCount: number): number {
  return Math.max(0, verifiedCount) * XP_PER_VERIFIED_REPORT;
}

export async function countVerifiedReportsByUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from("reports")
    .select("user_id, notes")
    .in("user_id", userIds)
    .eq("status", "verified")
    .eq("ai_verified", true);

  if (error) {
    console.error("[real-stats] reports batch", error);
    return map;
  }

  for (const row of data ?? []) {
    if (!isPublicZoneReport(row)) continue;
    const uid = row.user_id as string;
    if (!uid) continue;
    map.set(uid, (map.get(uid) ?? 0) + 1);
  }

  return map;
}

/** Статистика профиля — только строки reports с вашим user_id */
export async function computeProfileStats(
  authClient: SupabaseClient,
  userId: string,
): Promise<ProfileStats> {
  const { data: reports, error } = await authClient
    .from("reports")
    .select("id, status, ai_verified, notes")
    .eq("user_id", userId);

  if (error) {
    console.error("[profile] reports", error);
    return { dumpsSubmitted: 0, cleanupsParticipation: 0, verifications: 0 };
  }

  const rows = (reports ?? []).filter(isPublicZoneReport);
  const verified = rows.filter(
    (r) => r.status === "verified" && r.ai_verified === true,
  );

  const { data: membership } = await authClient
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  const teamIds = new Set(
    (membership ?? []).map((m) => m.team_id as string).filter(Boolean),
  );

  let cleanupsParticipation = 0;
  if (teamIds.size > 0) {
    const { data: cleanups, error: cleanupsError } = await authClient
      .from("team_cleanups")
      .select("team_id")
      .in("team_id", [...teamIds]);

    if (cleanupsError) {
      console.error("[profile] cleanups", cleanupsError);
    } else {
      cleanupsParticipation = (cleanups ?? []).filter((c) =>
        teamIds.has(c.team_id as string),
      ).length;
    }
  }

  return {
    dumpsSubmitted: rows.length,
    cleanupsParticipation,
    verifications: verified.length,
  };
}
