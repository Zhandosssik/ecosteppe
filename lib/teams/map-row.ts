import type {
  TeamCleanup,
  TeamCleanupEvent,
  TeamMember,
  TeamMessage,
  TeamSummary,
} from "@/types/teams";

type TeamRow = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  member_count: number;
  total_xp: number;
  dumps_cleared: number;
  captain_id?: string | null;
};

export function mapTeamRow(
  row: TeamRow,
  opts?: { isCaptain?: boolean; isMember?: boolean },
): TeamSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    logoUrl: row.logo_url ?? null,
    memberCount: row.member_count,
    totalXp: row.total_xp,
    dumpsCleared: row.dumps_cleared,
    captainId: row.captain_id ?? null,
    isCaptain: opts?.isCaptain,
    isMember: opts?.isMember,
  };
}

export function mapMember(
  row: {
    user_id: string;
    joined_at: string;
    profiles?: {
      display_name: string | null;
      avatar_url: string | null;
      xp: number;
    } | null;
  },
  captainId: string | null,
): TeamMember {
  const p = row.profiles;
  return {
    userId: row.user_id,
    displayName: p?.display_name?.trim() || "Батыр",
    avatarUrl: p?.avatar_url ?? null,
    xp: p?.xp ?? 0,
    joinedAt: row.joined_at,
    isCaptain: row.user_id === captainId,
  };
}

export function mapCleanup(row: {
  id: string;
  report_id: string | null;
  photo_url: string | null;
  cleared_at: string;
  title: string | null;
}): TeamCleanup {
  return {
    id: row.id,
    reportId: row.report_id,
    photoUrl: row.photo_url,
    clearedAt: row.cleared_at,
    title: row.title,
  };
}

export function mapEvent(row: {
  id: string;
  report_id: string | null;
  scheduled_at: string;
  title: string | null;
  created_by: string;
}): TeamCleanupEvent {
  return {
    id: row.id,
    reportId: row.report_id,
    scheduledAt: row.scheduled_at,
    title: row.title,
    createdBy: row.created_by,
  };
}

export function mapMessage(
  row: {
    id: string;
    team_id: string;
    user_id: string;
    body: string;
    created_at: string;
    profiles?: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  },
): TeamMessage {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name?.trim() || "Батыр",
    authorAvatar: row.profiles?.avatar_url ?? null,
  };
}
