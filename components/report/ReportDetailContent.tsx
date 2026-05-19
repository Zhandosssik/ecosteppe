"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { RouteIcon } from "@/components/icons/RouteIcon";
import { ReportPhotoLightbox } from "@/components/report/ReportPhotoLightbox";
import {
  formatCoordinates,
  formatDistanceKm,
} from "@/lib/geo/format-distance";
import {
  formatRouteDistanceMeters,
  formatRouteDuration,
} from "@/lib/map/format-route";
import {
  buildGoogleMapsRouteUrl,
  buildYandexMapsRouteUrl,
} from "@/lib/map/navigation-links";
import { formatReportDate } from "@/lib/reports/format-report";
import type { RouteBuildState } from "@/types/map-route";
import type { NearbyReport } from "@/types/report";

type ReportDetailContentProps = {
  report: NearbyReport;
  onBackToList?: () => void;
  routeState: RouteBuildState;
  userPosition: [number, number] | null;
  onBuildRoute: () => void;
  onClearRoute: () => void;
};

export function ReportDetailContent({
  report,
  onBackToList,
  routeState,
  userPosition,
  onBuildRoute,
  onClearRoute,
}: ReportDetailContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const routeReady =
    routeState.status === "ready" &&
    routeState.route.reportId === report.id;
  const routeLoading = routeState.status === "loading";
  const routeError =
    routeState.status === "error" ? routeState.message : null;

  const navigatorUrl =
    userPosition != null
      ? buildYandexMapsRouteUrl(
          userPosition[0],
          userPosition[1],
          report.lat,
          report.lng,
        )
      : null;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {report.photo_url ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative mx-4 mt-1 h-[33%] max-h-[22dvh] min-h-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-steppe-deep/8 transition active:scale-[0.99]"
            aria-label="Открыть фото на весь экран"
          >
            <Image
              src={report.photo_url}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-1.5 text-left text-[10px] font-medium text-white">
              Нажмите, чтобы открыть фото
            </span>
          </button>
        ) : (
          <div
            className="mx-4 mt-1 flex h-[33%] max-h-[22dvh] min-h-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-steppe-deep/8"
          >
            <p className="text-xs text-steppe-deep/45">Фото не приложено</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-2">
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="mb-2 text-xs font-medium text-steppe-mid transition active:opacity-70"
            >
              ← Ближайшие зоны
            </button>
          ) : null}
          <h2 className="text-base font-semibold leading-snug text-steppe-deep">
            Зона загрязнения
          </h2>
          <p className="mt-1 text-sm font-medium text-steppe-mid">
            {formatDistanceKm(report.distance_km)} от вас
          </p>

          <dl className="mt-3 space-y-2.5 text-sm">
            <DetailRow label="Координаты">
              {formatCoordinates(report.lat, report.lng)}
            </DetailRow>
            <DetailRow label="Зафиксировано">
              {formatReportDate(report.created_at)}
            </DetailRow>
            {report.notes ? (
              <DetailRow label="Описание">{report.notes}</DetailRow>
            ) : null}
            <DetailRow label="Статус">
              {report.status === "verified"
                ? "Подтверждена"
                : report.status === "pending"
                  ? "На модерации"
                  : "Отклонена"}
            </DetailRow>
          </dl>
        </div>

        <div className="shrink-0 border-t border-sand-dark/50 px-4 pt-3 pb-3">
          {routeReady ? (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium text-steppe-deep">
                {formatRouteDistanceMeters(routeState.route.distanceM)} ·{" "}
                {formatRouteDuration(routeState.route.durationS)}
              </p>
              <p className="text-center text-[11px] text-steppe-deep/50">
                Маршрут на карте · по дорогам (приблизительно)
              </p>
              {navigatorUrl ? (
                <a
                  href={navigatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-steppe-mid text-sm font-semibold text-white transition active:scale-[0.98]"
                >
                  Открыть в Яндекс Картах
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClearRoute}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-white text-sm font-medium text-steppe-deep/70 ring-1 ring-steppe-deep/10 transition active:scale-[0.98]"
              >
                Сбросить маршрут
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {routeError ? (
                <p className="text-center text-xs text-red-700/90">{routeError}</p>
              ) : null}
              <button
                type="button"
                onClick={onBuildRoute}
                disabled={routeLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-steppe-deep text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {routeLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <RouteIcon className="h-4 w-4" />
                )}
                {routeLoading ? "Строим маршрут…" : "Составить маршрут"}
              </button>
              {userPosition && navigatorUrl ? (
                <a
                  href={buildGoogleMapsRouteUrl(
                    userPosition[0],
                    userPosition[1],
                    report.lat,
                    report.lng,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-medium text-steppe-mid underline-offset-2 hover:underline"
                >
                  Или открыть в Google Картах
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && report.photo_url ? (
        <ReportPhotoLightbox
          photoUrl={report.photo_url}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-steppe-deep/45 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-steppe-deep/85">{children}</dd>
    </div>
  );
}
