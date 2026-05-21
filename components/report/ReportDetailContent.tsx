"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { RouteIcon } from "@/components/icons/RouteIcon";
import { ReportPhotoLightbox } from "@/components/report/ReportPhotoLightbox";
import { dismissReportAsNatural } from "@/lib/reports/dismiss-natural";
import { submitReport } from "@/lib/reports/submit-report";
import { useCleanupSession } from "@/hooks/use-cleanup-session";
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
import { daysUntilCompletedRemoval } from "@/lib/reports/completed-retention";
import { formatReportDate } from "@/lib/reports/format-report";
import type { RouteBuildState } from "@/types/map-route";
import type { ReportListItem } from "@/types/report";

type ReportDetailContentProps = {
  report: ReportListItem;
  onBackToList?: () => void;
  routeState: RouteBuildState;
  userPosition: [number, number] | null;
  onBuildRoute: () => void;
  onClearRoute: () => void;
  onCleanupSubmitted?: () => void;
  onDismissedNatural?: () => void;
  /** Завершённая уборка — без повторной очистки */
  isCompleted?: boolean;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ReportDetailContent({
  report,
  onBackToList,
  routeState,
  userPosition,
  onBuildRoute,
  onClearRoute,
  onCleanupSubmitted,
  onDismissedNatural,
  isCompleted = false,
}: ReportDetailContentProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [cleanupSubmitting, setCleanupSubmitting] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [dismissSubmitting, setDismissSubmitting] = useState(false);
  const [dismissNotice, setDismissNotice] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cleanupInputRef = useRef<HTMLInputElement>(null);

  const { active, doneIds, startCleanup, finishCleanup, cancelCleanup } =
    useCleanupSession();

  const isThisActive = active?.reportId === report.id;
  const anotherActive = active !== null && !isThisActive;
  const isDone =
    isCompleted || Boolean(report.cleaned_at) || doneIds.includes(report.id);

  // Tick timer when this report's cleanup is active
  useEffect(() => {
    if (!isThisActive || !active) {
      setElapsedSeconds(0);
      return;
    }
    const initial = Math.floor((Date.now() - active.startedAt) / 1000);
    setElapsedSeconds(initial);
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - active.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isThisActive, active]);

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

  const handleStartCleanup = () => {
    if (isDone) return;
    setCleanupError(null);
    startCleanup(report.id);
  };

  const handleCancelCleanup = () => {
    cancelCleanup();
    setCleanupError(null);
  };

  const handleFinishClick = () => {
    if (cleanupSubmitting) return;
    cleanupInputRef.current?.click();
  };

  const handleCleanupPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    setCleanupError(null);
    setCleanupSubmitting(true);

    const result = await submitReport({
      photo: file,
      lat: report.lat,
      lng: report.lng,
      notes: "Уборка завершена",
      cleanupOf: report.id,
    });

    setCleanupSubmitting(false);

    if (!result.ok) {
      setCleanupError(result.message);
      return;
    }

    if (result.status !== "verified") {
      setCleanupError(
        result.message ??
          "ИИ не подтвердил уборку. Зона остаётся активной — попробуйте снова позже.",
      );
      return;
    }

    finishCleanup(report.id);
    onCleanupSubmitted?.();
  };

  const handleDismissNatural = async () => {
    if (dismissSubmitting || isDone) return;
    setDismissNotice(null);
    setCleanupError(null);
    setDismissSubmitting(true);

    const result = await dismissReportAsNatural(report.id);
    setDismissSubmitting(false);

    if (!result.ok) {
      setCleanupError(result.message);
      return;
    }

    setDismissNotice(result.message);
    cancelCleanup();
    window.setTimeout(() => onDismissedNatural?.(), 600);
  };

  const canDismissNatural =
    !isDone && report.status === "verified" && !isCompleted;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ReportPhotos
          beforeUrl={report.photo_url}
          afterUrl={isDone ? report.cleanup_photo_url : null}
          onOpenPhoto={setLightboxUrl}
        />

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
          {report.distance_km !== undefined &&
          Number.isFinite(report.distance_km) ? (
            <p className="mt-1 text-sm font-medium text-steppe-mid">
              {formatDistanceKm(report.distance_km)} от вас
            </p>
          ) : null}

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
              {isDone
                ? "Уборка завершена"
                : report.status === "verified"
                  ? "Подтверждена"
                  : report.status === "pending"
                    ? "На модерации"
                    : "Отклонена"}
            </DetailRow>
            {report.cleaned_at ? (
              <DetailRow label="Убрано">
                {formatReportDate(report.cleaned_at)}
                {isCompleted
                  ? ` · в списке ещё ${daysUntilCompletedRemoval(report.cleaned_at)} дн.`
                  : ""}
              </DetailRow>
            ) : null}
          </dl>
        </div>

        <div className="shrink-0 border-t border-sand-dark/50 px-4 pt-3 pb-3">
          <input
            ref={cleanupInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCleanupPhoto}
          />

          {/* Cleanup block */}
          <div className="mb-3 space-y-2">
            {cleanupError ? (
              <p className="text-center text-xs text-red-700/90">{cleanupError}</p>
            ) : null}
            {dismissNotice ? (
              <p className="text-center text-xs text-steppe-mid">{dismissNotice}</p>
            ) : null}

            {canDismissNatural ? (
              <div className="rounded-xl bg-sand-dark/40 px-3 py-2.5">
                <p className="text-center text-[11px] leading-relaxed text-steppe-deep/55">
                  Камень, галька или природный грунт — не мусор. ИИ мог ошибиться: тогда
                  уборка не нужна.
                </p>
                <button
                  type="button"
                  onClick={handleDismissNatural}
                  disabled={dismissSubmitting || cleanupSubmitting}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-xl bg-white text-xs font-semibold text-steppe-deep ring-1 ring-steppe-deep/12 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {dismissSubmitting ? "Снимаем заявку…" : "Это не мусор (камень / природа)"}
                </button>
              </div>
            ) : null}

            {isDone ? (
              <div className="flex h-11 w-full items-center justify-center rounded-xl bg-steppe-mid/15 px-3 text-center text-sm font-medium text-steppe-mid">
                ✓ Уборка завершена · повторная уборка недоступна
              </div>
            ) : isThisActive ? (
              <>
                {/* Timer banner */}
                <div className="flex items-center justify-between rounded-xl bg-steppe-deep px-4 py-2.5">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">
                      Время уборки
                    </p>
                    <p className="mt-0.5 font-mono text-2xl font-bold leading-none text-white">
                      {formatElapsed(elapsedSeconds)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelCleanup}
                    disabled={cleanupSubmitting}
                    className="text-xs font-medium text-white/50 transition active:opacity-70 disabled:opacity-30"
                  >
                    Отмена
                  </button>
                </div>

                <p className="text-center text-[11px] text-steppe-deep/50">
                  Уберите мусор и сфотографируйте то же место — ИИ сравнит с фото «до»
                </p>

                <button
                  type="button"
                  onClick={handleFinishClick}
                  disabled={cleanupSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-steppe-mid text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {cleanupSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  {cleanupSubmitting ? "Проверяем фото…" : "Завершить уборку"}
                </button>
              </>
            ) : anotherActive ? (
              <div className="flex h-11 w-full items-center justify-center rounded-xl bg-sand-dark/60 px-3 text-center text-xs font-medium text-steppe-deep/60">
                Сначала завершите текущую уборку
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartCleanup}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-steppe-mid text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                Убраться
              </button>
            )}
          </div>

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

      {lightboxUrl ? (
        <ReportPhotoLightbox
          photoUrl={lightboxUrl}
          label={
            lightboxUrl === report.cleanup_photo_url
              ? "Фото после уборки"
              : "Фото до уборки"
          }
          onClose={() => setLightboxUrl(null)}
        />
      ) : null}
    </>
  );
}

function ReportPhotos({
  beforeUrl,
  afterUrl,
  onOpenPhoto,
}: {
  beforeUrl: string | null;
  afterUrl?: string | null;
  onOpenPhoto: (url: string) => void;
}) {
  const hasAfter = Boolean(afterUrl);

  if (!beforeUrl && !afterUrl) {
    return (
      <div className="mx-4 mt-1 flex h-[33%] max-h-[22dvh] min-h-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-steppe-deep/8">
        <p className="text-xs text-steppe-deep/45">Фото не приложено</p>
      </div>
    );
  }

  if (!hasAfter) {
    return (
      <PhotoTile
        url={beforeUrl!}
        label="До уборки"
        onOpen={() => onOpenPhoto(beforeUrl!)}
        className="mx-4 mt-1 h-[33%] max-h-[22dvh] min-h-[4.5rem]"
      />
    );
  }

  return (
    <div className="mx-4 mt-1 grid min-h-[4.5rem] max-h-[22dvh] shrink-0 grid-cols-2 gap-2">
      <PhotoTile
        url={beforeUrl ?? afterUrl!}
        label="До"
        onOpen={() => onOpenPhoto(beforeUrl ?? afterUrl!)}
        className="h-[18dvh] min-h-[4.5rem]"
      />
      <PhotoTile
        url={afterUrl!}
        label="После"
        onOpen={() => onOpenPhoto(afterUrl!)}
        className="h-[18dvh] min-h-[4.5rem]"
      />
    </div>
  );
}

function PhotoTile({
  url,
  label,
  onOpen,
  className,
}: {
  url: string;
  label: string;
  onOpen: () => void;
  className?: string;
}) {
  const handleOpen = (e: MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };
  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`relative overflow-hidden rounded-2xl bg-white ring-1 ring-steppe-deep/8 transition active:scale-[0.99] ${className ?? ""}`}
      aria-label={`Открыть фото: ${label}`}
    >
      <Image
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="50vw"
        unoptimized
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1 text-left text-[10px] font-medium text-white">
        {label}
      </span>
    </button>
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
