import type { RegionalLeaderboardEntry } from "@/types/leaderboard";

function TrendBadge({ trendPct }: { trendPct: number }) {
  const up = trendPct > 0;
  const flat = trendPct === 0;
  const label = flat
    ? "без изменений"
    : `${up ? "+" : ""}${trendPct.toFixed(1)}% за неделю`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
        flat
          ? "bg-steppe-deep/8 text-steppe-deep/60"
          : up
            ? "bg-emerald-100 text-emerald-800"
            : "bg-red-50 text-red-700"
      }`}
    >
      {!flat ? (up ? "↑" : "↓") : "—"} {label}
    </span>
  );
}

export function RegionalLeaderboard({
  entries,
}: {
  entries: RegionalLeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-steppe-deep/55">
        Региональный рейтинг появится, когда в системе накопятся реальные
        данные по областям
      </p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {entries.map((region) => (
        <li key={region.id}>
          <div className="rounded-xl border border-sand-dark/60 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-steppe-deep">{region.name}</p>
                <p className="mt-0.5 text-xs text-steppe-deep/55">
                  {region.cleared7d} точек за 7 дн. · всего {region.clearedTotal}
                </p>
              </div>
              <span className="shrink-0 text-lg font-bold text-steppe-deep">
                #{region.rank}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-steppe-mid">
                  {region.liquidationPct7d.toFixed(1)}%
                </p>
                <p className="text-[10px] text-steppe-deep/45">
                  ликвидировано за 7 дней
                </p>
              </div>
              <TrendBadge trendPct={region.trendPct} />
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-dark/50"
              role="progressbar"
              aria-valuenow={region.liquidationPct7d}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-steppe-light transition-all"
                style={{ width: `${Math.min(100, region.liquidationPct7d)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
