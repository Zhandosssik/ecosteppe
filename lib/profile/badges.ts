import type { ProfileBadge, ProfileStats } from "@/types/profile";

const BADGE_DEFS: Omit<ProfileBadge, "earned">[] = [
  {
    id: "first_dump",
    title: "Первый след",
    icon: "📍",
    description: "Отправлена первая заявка о свалке",
  },
  {
    id: "keeper",
    title: "Страж степи",
    icon: "🛡️",
    description: "5 подтверждённых заявок",
  },
  {
    id: "team_player",
    title: "В отряде",
    icon: "🤝",
    description: "Вступление в команду",
  },
  {
    id: "cleanup",
    title: "Уборщик",
    icon: "🧹",
    description: "Участие в уборке команды",
  },
  {
    id: "xp_500",
    title: "500 XP",
    icon: "⭐",
    description: "Накоплено 500 XP",
  },
  {
    id: "legend_path",
    title: "Путь батыра",
    icon: "🏔️",
    description: "20 подтверждённых заявок",
  },
];

export function computeBadges(
  stats: ProfileStats,
  xp: number,
  hasTeam: boolean,
): ProfileBadge[] {
  return BADGE_DEFS.map((def) => {
    let earned = false;
    switch (def.id) {
      case "first_dump":
        earned = stats.dumpsSubmitted >= 1;
        break;
      case "keeper":
        earned = stats.verifications >= 5;
        break;
      case "team_player":
        earned = hasTeam;
        break;
      case "cleanup":
        earned = stats.cleanupsParticipation >= 1;
        break;
      case "xp_500":
        earned = xp >= 500;
        break;
      case "legend_path":
        earned = stats.verifications >= 20;
        break;
      default:
        break;
    }
    return { ...def, earned };
  });
}
