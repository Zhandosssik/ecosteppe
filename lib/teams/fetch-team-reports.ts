import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamCleanup } from "@/types/teams";

export async function fetchTeamVerifiedReports(
  supabase: SupabaseClient,
  memberIds: string[],
  limit = 12,
): Promise<TeamCleanup[]> {
  if (memberIds.length === 0) return [];

  const { data } = await supabase
    .from("reports")
    .select("id, photo_url, created_at, notes")
    .in("user_id", memberIds)
    .eq("status", "verified")
    .eq("ai_verified", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    reportId: r.id as string,
    photoUrl: (r.photo_url as string | null) ?? null,
    clearedAt: r.created_at as string,
    title: (r.notes as string | null)?.trim() || null,
  }));
}

export async function countTeamVerifiedReports(
  supabase: SupabaseClient,
  memberIds: string[],
): Promise<number> {
  if (memberIds.length === 0) return 0;

  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .in("user_id", memberIds)
    .eq("status", "verified")
    .eq("ai_verified", true);

  return count ?? 0;
}
