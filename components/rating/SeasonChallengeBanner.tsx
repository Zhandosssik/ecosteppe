import type { SeasonalChallenge } from "@/types/leaderboard";

function formatDateRange(startsAt: string, endsAt: string) {
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const start = fmt.format(new Date(startsAt));
  const end = fmt.format(new Date(endsAt));
  return `${start} — ${end}`;
}

export function SeasonChallengeBanner({
  challenge,
}: {
  challenge: SeasonalChallenge | null;
}) {
  if (!challenge) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steppe-deep to-steppe-mid px-4 py-4 text-white shadow-md"
      aria-label="Сезонный челлендж"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        Активный сезон
      </p>
      <h2 className="mt-1 text-lg font-semibold leading-tight">{challenge.title}</h2>
      <p className="mt-1 text-xs text-white/80">
        {formatDateRange(challenge.startsAt, challenge.endsAt)}
      </p>
      <p className="mt-2 text-sm leading-snug text-white/90">{challenge.description}</p>
    </section>
  );
}
