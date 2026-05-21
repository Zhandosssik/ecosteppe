import { computeBadges } from "@/lib/profile/badges";
import { computeProfileStats } from "@/lib/profile/real-stats";
import {
  loadProfileCore,
  loadProfileSettings,
} from "@/lib/profile/load-profile-row";
import { syncProfileXpIfNeeded } from "@/lib/profile/sync-profile-xp";
import { getLevelProgress } from "@/lib/game/levels";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import type { ProfilePayload } from "@/types/profile";

export async function fetchProfileData(
  origin: string,
): Promise<ProfilePayload | null> {
  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) return null;

  const { data: authData } = await authClient.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const core = await loadProfileCore(authClient, user.id);
  const settings = await loadProfileSettings(authClient, user.id);
  const stats = await computeProfileStats(authClient, user.id);

  const storedXp = core?.xp ?? 0;
  const xp = await syncProfileXpIfNeeded(
    user.id,
    stats.verifications,
    storedXp,
  );
  const progressRaw = getLevelProgress(xp);

  const { data: membership } = await authClient
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  const teamIds = [
    ...new Set(
      (membership ?? [])
        .map((m) => m.team_id as string)
        .filter(Boolean),
    ),
  ];

  let teams: ProfilePayload["teams"] = [];
  if (teamIds.length > 0) {
    const { data: teamRows } = await authClient
      .from("teams")
      .select("id, name, logo_url")
      .in("id", teamIds);
    teams = (teamRows ?? []).map((t) => ({
      id: t.id as string,
      name: (t.name as string) || "Команда",
      logoUrl: (t.logo_url as string | null) ?? null,
    }));
  }

  const displayName =
    core?.display_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Батыр";

  const avatarUrl =
    core?.avatar_url ??
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  const badges = computeBadges(stats, xp, teams.length > 0);

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    avatarUrl,
    xp,
    locale: settings.locale,
    notificationsEnabled: settings.notifications_enabled,
    volunteerStatus: settings.volunteer_status,
    progress: {
      levelTitle: progressRaw.level.title,
      levelNumber: progressRaw.levelNumber,
      xp: progressRaw.xp,
      xpIntoLevel: progressRaw.xpIntoLevel,
      xpToNext: progressRaw.xpToNext,
      progressPct: progressRaw.progressPct,
      maxLevel: progressRaw.maxLevel,
    },
    stats,
    badges,
    teams,
    referralUrl: `${origin}/?ref=${user.id}`,
    fetchedAt: new Date().toISOString(),
  };
}
