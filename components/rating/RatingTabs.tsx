"use client";

import { useLanguage } from "@/lib/i18n/context";

export type RatingTab = "personal" | "teams";

export function RatingTabs({
  active,
  onChange,
}: {
  active: RatingTab;
  onChange: (tab: RatingTab) => void;
}) {
  const { t } = useLanguage();

  const tabs: { id: RatingTab; label: string }[] = [
    { id: "personal", label: t.rating.personalTab },
    { id: "teams", label: t.rating.teamsTab },
  ];

  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-xl bg-steppe-deep/6 p-1"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-semibold transition ${
              selected
                ? "bg-white text-steppe-deep shadow-sm"
                : "text-steppe-deep/50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
