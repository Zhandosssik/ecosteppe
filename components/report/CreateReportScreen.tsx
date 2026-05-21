"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { formatCoordinates } from "@/lib/geo/format-distance";
import { enqueueOfflineReport } from "@/lib/profile/offline-queue";
import { submitReport } from "@/lib/reports/submit-report";
import { useLanguage } from "@/lib/i18n/context";

const ReportPickMap = dynamic(
  () =>
    import("@/components/report/ReportPickMap").then((m) => m.ReportPickMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-44 items-center justify-center rounded-2xl bg-[#e8efe6]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-steppe-mid border-t-transparent" />
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
  const { t } = useLanguage();
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(
    () => userPosition,
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "ai" | "save">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mapInitialCenter = useMemo(
    () => userPosition ?? pickedPosition ?? ([51.1605, 71.4704] as [number, number]),
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
          ? t.reports.enableGeo
          : t.reports.markOnMap,
      );
      return;
    }

    setSubmitting(true);
    setSubmitPhase("ai");
    const result = await submitReport({
      photo: draft.file,
      lat: effectivePosition[0],
      lng: effectivePosition[1],
      notes: notes.trim(),
    });
    setSubmitting(false);
    setSubmitPhase("idle");

    if (!result.ok) {
      if (result.offline) {
        try {
          const photoDataUrl = await readFileAsDataUrl(draft.file);
          enqueueOfflineReport({
            lat: effectivePosition[0],
            lng: effectivePosition[1],
            notes: notes.trim(),
            photoDataUrl,
          });
          setSuccess(true);
          setSuccessMessage(t.reports.offlineQueued);
          window.setTimeout(() => onSubmitted(), 1600);
          return;
        } catch {
          setError(t.reports.offlineSaveFail);
          return;
        }
      }
      setError(result.message);
      return;
    }

    setSuccess(true);
    setSuccessMessage(
      result.status === "verified"
        ? t.reports.verified
        : (result.message ?? t.reports.pendingVerification),
    );
    window.setTimeout(() => {
      onSubmitted();
    }, result.status === "verified" ? 900 : 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      role="dialog"
      aria-modal
      aria-label={t.reports.newReport}
    >
      <header className="flex shrink-0 items-center justify-between px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-base font-bold text-steppe-deep">{t.reports.newReport}</h1>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label={t.common.close}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-steppe-deep/50 transition active:scale-95 disabled:opacity-50"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      <div className="relative mx-4 h-[36dvh] max-h-64 min-h-36 shrink-0 overflow-hidden rounded-2xl bg-steppe-deep/5">
        <Image
          src={draft.previewUrl}
          alt={t.reports.photoCaption}
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
        <section>
          <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
            {t.reports.location}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <LocationModeButton
              active={locationMode === "current"}
              onClick={() => setLocationMode("current")}
              title={t.reports.currentLocation}
              subtitle={
                userPosition
                  ? formatCoordinates(userPosition[0], userPosition[1])
                  : t.reports.gpsNotFound
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
              title={t.reports.pickOnMap}
              subtitle={t.reports.clickOnMap}
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
            <p className="mt-2 text-center text-xs text-steppe-deep/45">
              {t.reports.waitingCoords}
            </p>
          ) : null}
        </section>

        <section className="mt-5">
          <label
            htmlFor="report-notes"
            className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase"
          >
            {t.reports.additionalInfo}
          </label>
          <textarea
            id="report-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.reports.notesPlaceholder}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl bg-sand px-3 py-2.5 text-sm text-steppe-deep ring-1 ring-steppe-deep/8 placeholder:text-steppe-deep/30 focus:ring-2 focus:ring-steppe-mid/40 focus:outline-none"
          />
        </section>

        {error ? (
          <p className="mt-3 text-center text-xs text-red-600">{error}</p>
        ) : null}

        {success && successMessage ? (
          <p className="mt-3 text-center text-sm font-medium text-steppe-mid">
            {successMessage}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sand-dark/50 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || success}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-steppe-deep text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {submitting
            ? submitPhase === "ai"
              ? t.reports.checking
              : t.reports.saving
            : success
              ? t.reports.done
              : t.reports.submitBtn}
        </button>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
      className={`rounded-xl px-3 py-2.5 text-left transition active:scale-[0.99] ${
        active
          ? "bg-steppe-deep text-white ring-2 ring-steppe-deep"
          : "bg-sand text-steppe-deep ring-1 ring-steppe-deep/8"
      }`}
    >
      <span className="block text-xs font-semibold leading-snug">{title}</span>
      <span
        className={`mt-0.5 block text-[10px] leading-tight ${
          active ? "text-white/65" : "text-steppe-deep/40"
        }`}
      >
        {subtitle}
      </span>
    </button>
  );
}
