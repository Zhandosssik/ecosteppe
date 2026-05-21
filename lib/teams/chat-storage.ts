import type { TeamMessage } from "@/types/teams";

const PREFIX = "ecosteppe:team-chat:";

export type PendingChatMessage = {
  tempId: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
};

export type TeamChatCache = {
  messages: TeamMessage[];
  pending: PendingChatMessage[];
  updatedAt: string;
};

function storageKey(teamId: string) {
  return `${PREFIX}${teamId}`;
}

export function readTeamChatCache(teamId: string): TeamChatCache | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(teamId));
    if (!raw) return null;
    return JSON.parse(raw) as TeamChatCache;
  } catch {
    return null;
  }
}

export function writeTeamChatCache(teamId: string, cache: TeamChatCache) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(teamId), JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

export function mergeMessages(
  server: TeamMessage[],
  cached: TeamMessage[],
  pending: PendingChatMessage[],
  currentUserId: string,
): TeamMessage[] {
  const byId = new Map<string, TeamMessage>();
  for (const m of [...cached, ...server]) {
    byId.set(m.id, m);
  }
  for (const p of pending) {
    byId.set(p.tempId, {
      id: p.tempId,
      teamId: "",
      userId: p.userId,
      body: p.body,
      createdAt: p.createdAt,
      authorName: p.authorName,
    });
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function addPendingMessage(
  teamId: string,
  pending: PendingChatMessage,
): TeamChatCache {
  const existing =
    readTeamChatCache(teamId) ??
    ({ messages: [], pending: [], updatedAt: new Date().toISOString() } satisfies TeamChatCache);
  const next: TeamChatCache = {
    ...existing,
    pending: [...existing.pending, pending],
    updatedAt: new Date().toISOString(),
  };
  writeTeamChatCache(teamId, next);
  return next;
}

export function clearPending(teamId: string, tempId: string) {
  const cache = readTeamChatCache(teamId);
  if (!cache) return;
  writeTeamChatCache(teamId, {
    ...cache,
    pending: cache.pending.filter((p) => p.tempId !== tempId),
    updatedAt: new Date().toISOString(),
  });
}

export function saveSyncedMessages(teamId: string, messages: TeamMessage[]) {
  const cache = readTeamChatCache(teamId);
  writeTeamChatCache(teamId, {
    messages,
    pending: cache?.pending ?? [],
    updatedAt: new Date().toISOString(),
  });
}
