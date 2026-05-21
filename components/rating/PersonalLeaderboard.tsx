import { AvatarBadge } from "@/components/rating/AvatarBadge";
import type { PersonalLeaderboardEntry } from "@/types/leaderboard";

function formatXp(xp: number) {
  return new Intl.NumberFormat("ru-RU").format(xp);
}

export function PersonalLeaderboard({
  entries,
  currentUserId,
}: {
  entries: PersonalLeaderboardEntry[];
  currentUserId: string | null;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-steppe-deep/55">
        Пока никто не заработал XP. Создайте verified-заявку о мусоре (+50 XP)
      </p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {entries.map((entry) => {
        const isCurrent =
          currentUserId !== null && entry.id === currentUserId;
        const medal =
          entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;

        return (
          <li key={entry.id}>
            <div
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                isCurrent
                  ? "border-steppe-light bg-sky/80 shadow-sm ring-1 ring-steppe-light/50"
                  : "border-sand-dark/60 bg-white"
              }`}
            >
              <span
                className="w-7 shrink-0 text-center text-sm font-bold text-steppe-deep/70"
                aria-label={`Место ${entry.rank}`}
              >
                {medal ?? entry.rank}
              </span>
              <AvatarBadge name={entry.displayName} imageUrl={entry.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-steppe-deep">
                  {entry.displayName}
                  {isCurrent ? (
                    <span className="ml-1.5 text-xs font-medium text-steppe-mid">
                      (вы)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-steppe-mid">{entry.levelTitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-steppe-deep">
                  {formatXp(entry.xp)}
                </p>
                <p className="text-[10px] text-steppe-deep/45">XP</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
