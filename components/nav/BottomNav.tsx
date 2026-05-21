"use client";

import Link from "next/link";
import { HomeIcon } from "@/components/icons/HomeIcon";
import { ProfileIcon } from "@/components/icons/ProfileIcon";
import { ReportsIcon } from "@/components/icons/ReportsIcon";
import { TeamsIcon } from "@/components/icons/TeamsIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { BOTTOM_NAV_CLASS } from "@/lib/layout/constants";
import { useLanguage } from "@/lib/i18n/context";

export type NavTab = "home" | "teams" | "reports" | "rating" | "profile";

type BottomNavProps = {
  activeTab: NavTab;
};

const iconClass = "h-5 w-5";

export function BottomNav({ activeTab }: BottomNavProps) {
  const { t } = useLanguage();
  const isReports = activeTab === "reports";

  return (
    <nav
      data-bottom-nav
      className={`${BOTTOM_NAV_CLASS} relative shrink-0 border-t border-sand-dark/50 bg-white/98 px-1 pt-1 backdrop-blur-xl`}
      aria-label={t.nav.home}
    >
      <ul className="mx-auto flex h-14 max-w-md items-end justify-between">
        <NavItem
          href="/"
          label={t.nav.home}
          icon={<HomeIcon className={iconClass} />}
          active={activeTab === "home"}
        />

        <NavItem
          href="/teams"
          label={t.nav.teams}
          icon={<TeamsIcon className={iconClass} />}
          active={activeTab === "teams"}
        />

        <li className="relative flex flex-1 justify-center">
          <Link
            href="/reports"
            aria-current={isReports ? "page" : undefined}
            className="group -mt-5 flex min-h-11 min-w-11 flex-col items-center justify-end gap-1 pb-0.5"
          >
            <span
              className={`flex h-13 w-13 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition active:scale-95 ${
                isReports
                  ? "bg-steppe-deep text-white shadow-steppe-deep/20"
                  : "bg-steppe-mid text-white shadow-steppe-mid/25 group-hover:bg-steppe-deep"
              }`}
            >
              <ReportsIcon className="h-6 w-6" />
            </span>
            <span
              className={`text-[10px] font-semibold ${
                isReports ? "text-steppe-deep" : "text-steppe-mid"
              }`}
            >
              {t.nav.reports}
            </span>
          </Link>
        </li>

        <NavItem
          href="/rating"
          label={t.nav.rating}
          icon={<TrophyIcon className={iconClass} />}
          active={activeTab === "rating"}
        />

        <NavItem
          href="/profile"
          label={t.nav.profile}
          icon={<ProfileIcon className={iconClass} />}
          active={activeTab === "profile"}
        />
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <li className="flex flex-1 justify-center pb-0.5">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-colors ${
          active ? "text-steppe-deep" : "text-steppe-deep/35"
        }`}
      >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    </li>
  );
}
