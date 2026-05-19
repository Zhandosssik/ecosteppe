"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  formatCoordinates,
  formatDistanceKm,
} from "@/lib/geo/format-distance";
import {
  getProximityTier,
  PROXIMITY_TIER_BG_CLASS,
} from "@/lib/geo/proximity-tier";
import type { NearbyReport } from "@/types/report";
import type { NearbyState } from "@/hooks/use-nearby-reports";
import { formatReportDateShort } from "@/lib/reports/format-report";

type NearbyReportsListProps = {
  state: NearbyState;
  onSelectReport?: (report: NearbyReport) => void;
};

export function NearbyReportsList({
  state,
  onSelectReport,
}: NearbyReportsListProps) {
  if (state.status === "waiting_geo") {
    return (
      <ListMessage>
        Определяем ваше местоположение, чтобы показать ближайшие зоны…
      </ListMessage>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return <ListMessage>Загружаем заявки рядом с вами…</ListMessage>;
  }

  if (state.status === "error") {
    return <ListMessage variant="error">{state.message}</ListMessage>;
  }

  if (state.reports.length === 0) {
    return (
      <ListMessage>
        Пока нет подтверждённых зон загрязнения в базе. Когда появятся реальные
        заявки — они отобразятся здесь по расстоянию от вас.
      </ListMessage>
    );
  }

  return (
    <ul className="flex flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-2">
      {state.reports.map((report) => {
        const tier = getProximityTier(report.distance_km);
        return (
        <li key={report.id}>
          <button
            type="button"
            onClick={() => onSelectReport?.(report)}
            className="flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-steppe-deep/8 transition active:scale-[0.99]"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-steppe-deep/5">
              {report.photo_url ? (
                <Image
                  src={report.photo_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-steppe-mid/40">
                  <TrashZoneGlyph />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-steppe-deep">
                  Зона загрязнения
                </p>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${PROXIMITY_TIER_BG_CLASS[tier]}`}
                    aria-hidden
                  />
                  <span className="rounded-full bg-steppe-light/25 px-2 py-0.5 text-xs font-bold text-steppe-deep">
                    {formatDistanceKm(report.distance_km)}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-steppe-deep/55">
                {formatCoordinates(report.lat, report.lng)}
              </p>
              <p className="mt-1 text-[11px] text-steppe-deep/40">
                {formatReportDateShort(report.created_at)}
              </p>
            </div>
          </button>
        </li>
        );
      })}
    </ul>
  );
}

function ListMessage({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "error";
}) {
  return (
    <p
      className={`px-5 py-6 text-center text-sm leading-relaxed ${
        variant === "error" ? "text-red-700" : "text-steppe-deep/55"
      }`}
    >
      {children}
    </p>
  );
}

function TrashZoneGlyph() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M12 9v4m0 4h.01M5 19h14a2 2 0 0 0 1.73-3l-7-12a2 2 0 0 0-3.46 0l-7 12A2 2 0 0 0 5 19z" />
    </svg>
  );
}
