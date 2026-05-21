export type SeasonalChallenge = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
};

export type PersonalLeaderboardEntry = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  levelTitle: string;
  rank: number;
};

export type TeamLeaderboardEntry = {
  id: string;
  name: string;
  logoUrl: string | null;
  memberCount: number;
  totalXp: number;
  dumpsCleared: number;
  rank: number;
};

export type RegionalLeaderboardEntry = {
  id: string;
  name: string;
  liquidationPct7d: number;
  clearedTotal: number;
  cleared7d: number;
  trendPct: number;
  rank: number;
};

export type LeaderboardPayload = {
  challenge: SeasonalChallenge | null;
  personal: PersonalLeaderboardEntry[];
  teams: TeamLeaderboardEntry[];
  regions: RegionalLeaderboardEntry[];
  meta: {
    currentUserId: string | null;
    currentTeamId: string | null;
  };
  fetchedAt: string;
};
