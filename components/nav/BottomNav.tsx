"use client";

import Link from "next/link";
import { HomeIcon } from "@/components/icons/HomeIcon";
import { ProfileIcon } from "@/components/icons/ProfileIcon";
import { BOTTOM_NAV_CLASS } from "@/lib/layout/constants";

export type NavTab = "home" | "profile";

type BottomNavProps = {
  activeTab: NavTab;
};

const iconClass = "h-6 w-6";

export function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav
      data-bottom-nav
      className={`${BOTTOM_NAV_CLASS} shrink-0 border-t border-sand-dark/60 bg-white/95 px-2 pt-1 backdrop-blur-md`}
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex h-14 max-w-md items-center justify-between">
        <li className="flex flex-1 justify-center">
          <Link
            href="/"
            aria-current={activeTab === "home" ? "page" : undefined}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition ${
              activeTab === "home"
                ? "text-steppe-deep"
                : "text-steppe-deep/35"
            }`}
          >
            <HomeIcon className={iconClass} />
            <span className="text-[10px] font-medium">Главная</span>
          </Link>
        </li>

        {[2, 3, 4].map((slot) => (
          <li key={slot} className="flex flex-1 justify-center">
            <span
              className="flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl text-steppe-deep/20"
              aria-hidden
            >
              <span className="h-6 w-6 rounded-lg bg-steppe-deep/8" />
            </span>
          </li>
        ))}

        <li className="flex flex-1 justify-center">
          <Link
            href="/profile"
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition ${
              activeTab === "profile"
                ? "text-steppe-deep"
                : "text-steppe-deep/35"
            }`}
          >
            <ProfileIcon className={iconClass} />
            <span className="text-[10px] font-medium">Профиль</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
