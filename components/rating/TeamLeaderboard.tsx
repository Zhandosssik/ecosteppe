"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/rating/AvatarBadge";
import type { TeamLeaderboardEntry } from "@/types/leaderboard";

function formatXp(xp: number) {
  return new Intl.NumberFormat("ru-RU").format(xp);
}

export function TeamLeaderboard({
  entries,
  currentTeamId,
  onJoin,
}: {
  entries: TeamLeaderboardEntry[];
  currentTeamId: string | null;
  onJoin: (teamId: string) => Promise<unknown>;
}) {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-steppe-deep/55">
        Команды пока не созданы
      </p>
    );
  }

  async function handleJoin(teamId: string) {
    setJoinError(null);
    setJoiningId(teamId);
    try {
      await onJoin(teamId);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div>
      {joinError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {joinError}
        </p>
      ) : null}
      <ul className="space-y-2" role="list">
        {entries.map((team) => {
          const inTeam = currentTeamId === team.id;
          const canJoin = !currentTeamId;

          return (
            <li key={team.id}>
              <div className="flex items-center gap-3 rounded-xl border border-sand-dark/60 bg-white px-3 py-3">
                <span className="w-7 shrink-0 text-center text-sm font-bold text-steppe-deep/70">
                  {team.rank}
                </span>
                {team.logoUrl ? (
                  <AvatarBadge name={team.name} imageUrl={team.logoUrl} size="sm" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steppe-deep/10 text-xs font-bold text-steppe-deep">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-steppe-deep">{team.name}</p>
                  <p className="text-xs text-steppe-deep/55">
                    {team.memberCount}{" "}
                    {team.memberCount === 1 ? "участник" : "участн."}
                    {team.dumpsCleared > 0
                      ? ` · ${team.dumpsCleared} свалок`
                      : null}
                  </p>
                  {team.totalXp > 0 ? (
                    <p className="text-xs font-medium text-steppe-mid">
                      {formatXp(team.totalXp)} XP
                    </p>
                  ) : null}
                </div>
                {inTeam ? (
                  <span className="shrink-0 rounded-lg bg-sky px-2.5 py-1.5 text-[10px] font-semibold text-steppe-deep">
                    Ваша команда
                  </span>
                ) : canJoin ? (
                  <button
                    type="button"
                    disabled={joiningId === team.id}
                    onClick={() => void handleJoin(team.id)}
                    className="min-h-11 shrink-0 rounded-xl bg-steppe-deep px-3 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {joiningId === team.id ? "…" : "Вступить"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
