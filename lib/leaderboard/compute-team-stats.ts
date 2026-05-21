import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { xpFromVerifiedCount } from "@/lib/profile/real-stats";

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  member_count: number;
  captain_id: string | null;
};

export async function attachRealTeamStats(
  supabase: SupabaseClient,
  teams: TeamRow[],
): Promise<
  {
    id: string;
    name: string;
    logoUrl: string | null;
    memberCount: number;
    totalXp: number;
    dumpsCleared: number;
    captainId: string | null;
  }[]
> {
  if (teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const readClient = createSupabaseAdminClient() ?? supabase;

  const { data: members } = await readClient
    .from("team_members")
    .select("team_id, user_id")
    .in("team_id", teamIds);

  const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];

  const { data: reports } =
    userIds.length > 0
      ? await supabase
          .from("reports")
          .select("user_id")
          .in("user_id", userIds)
          .eq("status", "verified")
          .eq("ai_verified", true)
      : { data: [] };

  const verifiedByUser = new Map<string, number>();
  for (const r of reports ?? []) {
    const uid = r.user_id as string;
    if (!uid) continue;
    verifiedByUser.set(uid, (verifiedByUser.get(uid) ?? 0) + 1);
  }

  const userToTeam = new Map<string, string>();
  for (const m of members ?? []) {
    userToTeam.set(m.user_id as string, m.team_id as string);
  }

  const xpByTeam = new Map<string, number>();
  const membersByTeam = new Map<string, number>();
  const memberIdsByTeam = new Map<string, Set<string>>();
  const cleanupsByTeam = new Map<string, number>();

  for (const m of members ?? []) {
    const tid = m.team_id as string;
    const uid = m.user_id as string;
    membersByTeam.set(tid, (membersByTeam.get(tid) ?? 0) + 1);
    if (!memberIdsByTeam.has(tid)) memberIdsByTeam.set(tid, new Set());
    memberIdsByTeam.get(tid)!.add(uid);
    const userXp = xpFromVerifiedCount(verifiedByUser.get(uid) ?? 0);
    xpByTeam.set(tid, (xpByTeam.get(tid) ?? 0) + userXp);
  }

  for (const r of reports ?? []) {
    const tid = userToTeam.get(r.user_id as string);
    if (tid) {
      cleanupsByTeam.set(tid, (cleanupsByTeam.get(tid) ?? 0) + 1);
    }
  }

  return teams.map((t) => {
    let memberCount = membersByTeam.get(t.id) ?? 0;
    if (
      t.captain_id &&
      !memberIdsByTeam.get(t.id)?.has(t.captain_id)
    ) {
      memberCount += 1;
    }

    return {
    id: t.id,
    name: t.name,
    logoUrl: t.logo_url,
    memberCount,
    totalXp: xpByTeam.get(t.id) ?? 0,
    dumpsCleared: cleanupsByTeam.get(t.id) ?? 0,
    captainId: t.captain_id,
  };
  });
}
