import type { SupabaseClient } from "@supabase/supabase-js";
import { mapEvent, mapMember, mapTeamRow } from "@/lib/teams/map-row";
import {
  countTeamVerifiedReports,
  fetchTeamVerifiedReports,
} from "@/lib/teams/fetch-team-reports";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTeamMember } from "@/lib/teams/team-auth";
import type { TeamDetailPayload, TeamMember } from "@/types/teams";

export async function fetchTeamDetail(
  teamId: string,
  currentUserId: string | null,
  authClient?: SupabaseClient | null,
): Promise<TeamDetailPayload | null> {
  const readClient =
    createSupabaseAdminClient() ?? authClient ?? createSupabaseServerClient();
  if (!readClient) return null;

  const { data: teamRow, error: teamError } = await readClient
    .from("teams")
    .select(
      "id, name, description, logo_url, member_count, total_xp, dumps_cleared, captain_id, created_at",
    )
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !teamRow) return null;

  const captainId = teamRow.captain_id as string | null;
  const isCaptain = Boolean(currentUserId && captainId === currentUserId);
  let isMember = isCaptain;

  if (currentUserId && authClient && !isMember) {
    isMember = await isTeamMember(authClient, teamId, currentUserId);
  }

  const [membersRes, eventsRes] = await Promise.all([
    readClient
      .from("team_members")
      .select("user_id, joined_at")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true }),
    isMember || isCaptain
      ? readClient
          .from("team_cleanup_events")
          .select("id, report_id, scheduled_at, title, created_by")
          .eq("team_id", teamId)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const memberRows = membersRes.data ?? [];
  const memberIds = [
    ...new Set(
      memberRows
        .map((m) => m.user_id as string)
        .concat(captainId ? [captainId] : []),
    ),
  ];

  let members: TeamMember[] = [];
  if (memberIds.length > 0) {
    const { data: profiles } = await readClient
      .from("profiles")
      .select("id, display_name, avatar_url, xp")
      .in("id", memberIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id as string, p]),
    );

    members = memberRows.map((row) =>
      mapMember(
        {
          user_id: row.user_id as string,
          joined_at: row.joined_at as string,
          profiles: profileMap.get(row.user_id as string) ?? null,
        },
        captainId,
      ),
    );

    if (captainId && !memberRows.some((r) => r.user_id === captainId)) {
      members.push(
        mapMember(
          {
            user_id: captainId,
            joined_at: teamRow.created_at as string,
            profiles: profileMap.get(captainId) ?? null,
          },
          captainId,
        ),
      );
    }
  } else if (captainId) {
    const { data: captainProfile } = await readClient
      .from("profiles")
      .select("id, display_name, avatar_url, xp")
      .eq("id", captainId)
      .maybeSingle();

    members = [
      mapMember(
        {
          user_id: captainId,
          joined_at: teamRow.created_at as string,
          profiles: captainProfile ?? null,
        },
        captainId,
      ),
    ];
  }

  members.sort((a, b) => b.xp - a.xp);

  const realTotalXp = members.reduce((sum, m) => sum + m.xp, 0);
  const dumpsCleared = await countTeamVerifiedReports(readClient, memberIds);
  const recentCleanups = await fetchTeamVerifiedReports(readClient, memberIds);

  const teamMapped = mapTeamRow(teamRow as Parameters<typeof mapTeamRow>[0], {
    isCaptain,
    isMember,
  });
  teamMapped.totalXp = realTotalXp;
  teamMapped.dumpsCleared = dumpsCleared;
  teamMapped.memberCount = members.length;

  return {
    team: teamMapped,
    members,
    recentCleanups,
    upcomingEvents: (eventsRes.data ?? []).map(mapEvent),
    meta: {
      currentUserId: currentUserId ?? "",
      isCaptain,
      isMember,
    },
  };
}
