"use client";

import { useLanguage } from "@/lib/i18n/context";
import type { ReportsListScope } from "@/types/report";

export function ReportsSectionTabs({
  active,
  onChange,
}: {
  active: ReportsListScope;
  onChange: (scope: ReportsListScope) => void;
}) {
  const { t } = useLanguage();

  const tabs: { id: ReportsListScope; label: string }[] = [
    { id: "active", label: t.reports.activeTab },
    { id: "completed", label: t.reports.completedTab },
  ];

  return (
    <div
      role="tablist"
      className="mt-3 flex gap-1 rounded-xl bg-steppe-deep/6 p-1"
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
