import { attachRealTeamStats } from "@/lib/leaderboard/compute-team-stats";
import { getLevelFromXp } from "@/lib/game/levels";
import { xpFromVerifiedCount } from "@/lib/profile/real-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import type { LeaderboardPayload } from "@/types/leaderboard";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function mapPersonal(
  profiles: ProfileRow[],
  verifiedByUser: Map<string, number>,
): LeaderboardPayload["personal"] {
  const rows = profiles
    .map((p) => ({
      id: p.id,
      displayName: p.display_name?.trim() || "Батыр",
      avatarUrl: p.avatar_url,
      xp: xpFromVerifiedCount(verifiedByUser.get(p.id) ?? 0),
    }))
    .filter((p) => p.xp > 0)
    .sort((a, b) => b.xp - a.xp);

  return rows.map((row, index) => ({
    ...row,
    levelTitle: getLevelFromXp(row.xp).title,
    rank: index + 1,
  }));
}

export type LeaderboardCore = Omit<LeaderboardPayload, "meta" | "fetchedAt">;

/** Публичные данные рейтинга — без cookies, можно кэшировать через unstable_cache. */
export async function fetchLeaderboardCore(): Promise<LeaderboardCore | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: verifiedRows } = await supabase
    .from("reports")
    .select("user_id")
    .eq("status", "verified")
    .eq("ai_verified", true)
    .not("user_id", "is", null);

  const verifiedByUser = new Map<string, number>();
  for (const row of verifiedRows ?? []) {
    const uid = row.user_id as string;
    verifiedByUser.set(uid, (verifiedByUser.get(uid) ?? 0) + 1);
  }

  const userIdsWithReports = [...verifiedByUser.keys()];

  let personal: LeaderboardPayload["personal"] = [];

  if (userIdsWithReports.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIdsWithReports);

    personal = mapPersonal(
      (profileRows ?? []) as ProfileRow[],
      verifiedByUser,
    );
  }

  const { data: teamsRaw } = await supabase
    .from("teams")
    .select("id, name, logo_url, member_count, captain_id")
    .not("captain_id", "is", null)
    .order("name", { ascending: true });

  const teamsWithStats = await attachRealTeamStats(
    supabase,
    (teamsRaw ?? []) as Parameters<typeof attachRealTeamStats>[1],
  );

  const teams = teamsWithStats
    .filter((t) => t.totalXp > 0 || t.dumpsCleared > 0 || t.memberCount > 0)
    .sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name, "ru"))
    .map((t, index) => ({
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      memberCount: t.memberCount,
      totalXp: t.totalXp,
      dumpsCleared: t.dumpsCleared,
      rank: index + 1,
    }));

  return {
    challenge: null,
    personal,
    teams,
    regions: [],
  };
}

export async function fetchLeaderboardMeta(): Promise<
  LeaderboardPayload["meta"]
> {
  const authClient = await createSupabaseAuthServerClient();
  let currentUserId: string | null = null;
  let currentTeamId: string | null = null;

  if (!authClient) {
    return { currentUserId, currentTeamId };
  }

  const { data: authData } = await authClient.auth.getSession();
  currentUserId = authData.session?.user?.id ?? null;

  if (currentUserId) {
    const { data: membership } = await authClient
      .from("team_members")
      .select("team_id")
      .eq("user_id", currentUserId)
      .maybeSingle();
    currentTeamId = membership?.team_id ?? null;

    if (!currentTeamId) {
      const { data: captained } = await authClient
        .from("teams")
        .select("id")
        .eq("captain_id", currentUserId)
        .limit(1)
        .maybeSingle();
      currentTeamId = captained?.id ?? null;
    }
  }

  return { currentUserId, currentTeamId };
}

export async function fetchLeaderboardData(): Promise<LeaderboardPayload | null> {
  const core = await fetchLeaderboardCore();
  if (!core) {
    return null;
  }
  const meta = await fetchLeaderboardMeta();
  return {
    ...core,
    meta,
    fetchedAt: new Date().toISOString(),
  };
}
