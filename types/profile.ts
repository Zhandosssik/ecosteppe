export type ProfileLocale = "ru" | "kk" | "en";

export type VolunteerStatus = "none" | "pending" | "approved" | "rejected";

export type ProfileBadge = {
  id: string;
  title: string;
  icon: string;
  earned: boolean;
  description: string;
};

export type ProfileTeamSummary = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type ProfileStats = {
  dumpsSubmitted: number;
  cleanupsParticipation: number;
  verifications: number;
};

export type ProfileProgress = {
  levelTitle: string;
  levelNumber: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  progressPct: number;
  maxLevel: boolean;
};

export type ProfilePayload = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  locale: ProfileLocale;
  notificationsEnabled: boolean;
  volunteerStatus: VolunteerStatus;
  progress: ProfileProgress;
  stats: ProfileStats;
  badges: ProfileBadge[];
  teams: ProfileTeamSummary[];
  referralUrl: string;
  fetchedAt: string;
};

export type ProfilePatchBody = {
  locale?: ProfileLocale;
  notificationsEnabled?: boolean;
  displayName?: string;
};
