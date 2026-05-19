"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { formatCoordinates } from "@/lib/geo/format-distance";
import { submitReport } from "@/lib/reports/submit-report";

const ReportPickMap = dynamic(
  () =>
    import("@/components/report/ReportPickMap").then((m) => m.ReportPickMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-44 items-center justify-center rounded-2xl bg-[#e8efe6]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-steppe-mid border-t-transparent" />
      </div>
    ),
  },
);

type LocationMode = "current" | "map";

export type CreateReportDraft = {
  file: File;
  previewUrl: string;
};

type CreateReportScreenProps = {
  draft: CreateReportDraft;
  userPosition: [number, number] | null;
  onClose: () => void;
  onSubmitted: () => void;
};

export function CreateReportScreen({
  draft,
  userPosition,
  onClose,
  onSubmitted,
}: CreateReportScreenProps) {
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(
    () => userPosition,
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mapInitialCenter = useMemo(
    () => userPosition ?? pickedPosition ?? [51.1605, 71.4704] as [number, number],
    [userPosition, pickedPosition],
  );

  useEffect(() => {
    if (userPosition && !pickedPosition) {
      setPickedPosition(userPosition);
    }
  }, [userPosition, pickedPosition]);

  const effectivePosition =
    locationMode === "current" ? userPosition : pickedPosition;

  const handleSubmit = async () => {
    setError(null);

    if (!effectivePosition) {
      setError(
        locationMode === "current"
          ? "Включите геолокацию или выберите точку на карте"
          : "Отметьте точку на карте",
      );
      return;
    }

    setSubmitting(true);
    const result = await submitReport({
      photo: draft.file,
      lat: effectivePosition[0],
      lng: effectivePosition[1],
      notes: notes.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      onSubmitted();
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-sand"
      role="dialog"
      aria-modal
      aria-label="Новая заявка"
    >
      <header className="flex shrink-0 items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-base font-semibold text-steppe-deep">Новая заявка</h1>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Закрыть"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-steppe-deep/55 ring-1 ring-steppe-deep/10 shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      <div className="relative mx-4 h-[38dvh] max-h-72 min-h-40 shrink-0 overflow-hidden rounded-2xl bg-steppe-deep/5 ring-1 ring-steppe-deep/10">
        <Image
          src={draft.previewUrl}
          alt="Снимок загрязнения"
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
        <section>
          <h2 className="text-xs font-medium tracking-wide text-steppe-deep/45 uppercase">
            Местоположение
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <LocationModeButton
              active={locationMode === "current"}
              onClick={() => setLocationMode("current")}
              title="Текущее местоположение"
              subtitle={
                userPosition
                  ? formatCoordinates(userPosition[0], userPosition[1])
                  : "GPS не определён"
              }
            />
            <LocationModeButton
              active={locationMode === "map"}
              onClick={() => {
                setLocationMode("map");
                if (!pickedPosition && userPosition) {
                  setPickedPosition(userPosition);
                }
              }}
              title="Отметить на карте"
              subtitle="Нажмите на карту"
            />
          </div>

          {locationMode === "current" && userPosition ? (
            <p className="mt-2 text-center text-xs text-steppe-mid">
              {formatCoordinates(userPosition[0], userPosition[1])}
            </p>
          ) : null}

          {locationMode === "map" && pickedPosition ? (
            <div className="mt-3">
              <ReportPickMap
                initialCenter={mapInitialCenter}
                position={pickedPosition}
                onPositionChange={(lat, lng) => setPickedPosition([lat, lng])}
              />
            </div>
          ) : null}

          {locationMode === "map" && !pickedPosition ? (
            <p className="mt-2 text-center text-xs text-steppe-deep/50">
              Ожидаем координаты для карты…
            </p>
          ) : null}
        </section>

        <section className="mt-5">
          <label
            htmlFor="report-notes"
            className="text-xs font-medium tracking-wide text-steppe-deep/45 uppercase"
          >
            Дополнительная информация
          </label>
          <textarea
            id="report-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Опишите загрязнение: тип мусора, объём, ориентиры…"
            rows={4}
            className="mt-2 w-full resize-none rounded-2xl bg-white px-3 py-2.5 text-sm text-steppe-deep ring-1 ring-steppe-deep/10 placeholder:text-steppe-deep/35 focus:ring-2 focus:ring-steppe-mid/40 focus:outline-none"
          />
        </section>

        {error ? (
          <p className="mt-3 text-center text-xs text-red-700">{error}</p>
        ) : null}

        {success ? (
          <p className="mt-3 text-center text-sm font-medium text-steppe-mid">
            Заявка отправлена
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sand-dark/60 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || success}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-steppe-deep text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {submitting
            ? "Отправляем…"
            : success
              ? "Готово"
              : "Отправить заявку"}
        </button>
      </div>
    </div>
  );
}

function LocationModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99] ${
        active
          ? "bg-steppe-deep text-white ring-2 ring-steppe-deep"
          : "bg-white text-steppe-deep ring-1 ring-steppe-deep/10"
      }`}
    >
      <span className="block text-xs font-semibold leading-snug">{title}</span>
      <span
        className={`mt-0.5 block text-[10px] leading-tight ${
          active ? "text-white/75" : "text-steppe-deep/45"
        }`}
      >
        {subtitle}
      </span>
    </button>
  );
}
