import type { TeamCleanupEvent } from "@/types/teams";

export function TeamCalendar({ events }: { events: TeamCleanupEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-steppe-deep/55">
        Нет запланированных уборок. Нажмите «Запланировать уборку».
      </p>
    );
  }

  const byMonth = new Map<string, TeamCleanupEvent[]>();
  for (const ev of events) {
    const key = new Date(ev.scheduledAt).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
    });
    const list = byMonth.get(key) ?? [];
    list.push(ev);
    byMonth.set(key, list);
  }

  return (
    <div className="space-y-4">
      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <div key={month}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-steppe-mid">
            {month}
          </h3>
          <ul className="mt-2 space-y-2">
            {monthEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-3 rounded-xl border border-sand-dark/60 bg-white px-3 py-3"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-sky text-steppe-deep">
                  <span className="text-lg font-bold leading-none">
                    {new Date(ev.scheduledAt).getDate()}
                  </span>
                  <span className="text-[9px] uppercase">
                    {new Date(ev.scheduledAt).toLocaleDateString("ru-RU", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-steppe-deep">
                    {ev.title ?? "Уборка степи"}
                  </p>
                  <p className="text-xs text-steppe-deep/55">
                    {new Date(ev.scheduledAt).toLocaleString("ru-RU", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
