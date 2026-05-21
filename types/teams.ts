export type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  memberCount: number;
  totalXp: number;
  dumpsCleared: number;
  captainId: string | null;
  isCaptain?: boolean;
  isMember?: boolean;
};

export type TeamMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  joinedAt: string;
  isCaptain: boolean;
};

export type TeamCleanup = {
  id: string;
  reportId: string | null;
  photoUrl: string | null;
  clearedAt: string;
  title: string | null;
};

export type TeamCleanupEvent = {
  id: string;
  reportId: string | null;
  scheduledAt: string;
  title: string | null;
  createdBy: string;
};

export type TeamMessage = {
  id: string;
  teamId: string;
  userId: string;
  body: string;
  createdAt: string;
  authorName?: string;
  authorAvatar?: string | null;
};

export type TeamDetailPayload = {
  team: TeamSummary;
  members: TeamMember[];
  recentCleanups: TeamCleanup[];
  upcomingEvents: TeamCleanupEvent[];
  meta: {
    currentUserId: string;
    isCaptain: boolean;
    isMember: boolean;
  };
};

export type ReportPickOption = {
  id: string;
  lat: number;
  lng: number;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
};
