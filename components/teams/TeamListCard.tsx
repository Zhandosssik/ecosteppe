"use client";

import Link from "next/link";
import { formatMemberCountShort } from "@/lib/teams/format-member-count";
import type { TeamSummary } from "@/types/teams";

export function TeamListCard({
  team,
  action,
}: {
  team: TeamSummary;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sand-dark/60 bg-white px-3 py-3">
      <Link href={`/teams/${team.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-steppe-deep/10 text-sm font-bold text-steppe-deep">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-steppe-deep">{team.name}</p>
          <p className="text-xs text-steppe-deep/55">
            {formatMemberCountShort(team.memberCount)}
            {team.totalXp > 0
              ? ` · ${team.totalXp.toLocaleString("ru-RU")} XP`
              : null}
          </p>
          {team.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-steppe-deep/45">
              {team.description}
            </p>
          ) : null}
        </div>
      </Link>
      {action}
    </div>
  );
}
