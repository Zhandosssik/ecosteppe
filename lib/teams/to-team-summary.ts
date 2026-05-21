import { attachRealTeamStats } from "@/lib/leaderboard/compute-team-stats";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamSummary } from "@/types/teams";

type TeamDbRow = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  member_count: number;
  captain_id?: string | null;
};

export async function teamsToSummaries(
  supabase: SupabaseClient,
  rows: TeamDbRow[],
  opts?: { userId?: string | null },
): Promise<TeamSummary[]> {
  const stats = await attachRealTeamStats(
    supabase,
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      logo_url: r.logo_url ?? null,
      member_count: r.member_count,
      captain_id: r.captain_id ?? null,
    })),
  );

  return rows.map((row) => {
    const s = stats.find((x) => x.id === row.id);
    const captainId = row.captain_id ?? null;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      logoUrl: row.logo_url ?? null,
      memberCount: s?.memberCount ?? 0,
      totalXp: s?.totalXp ?? 0,
      dumpsCleared: s?.dumpsCleared ?? 0,
      captainId,
      isCaptain: opts?.userId ? captainId === opts.userId : undefined,
      isMember: opts?.userId
        ? captainId === opts.userId || undefined
        : undefined,
    };
  });
}
