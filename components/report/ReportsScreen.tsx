"use client";

import { useCallback, useState } from "react";
import { CameraCaptureButton } from "@/components/camera/CameraCaptureButton";
import { CloseIcon } from "@/components/icons/CloseIcon";
import {
  CreateReportScreen,
  type CreateReportDraft,
} from "@/components/report/CreateReportScreen";
import { NearbyReportsList } from "@/components/report/NearbyReportsList";
import { ReportDetailContent } from "@/components/report/ReportDetailContent";
import { ReportsSectionTabs } from "@/components/report/ReportsSectionTabs";
import { useReportsList } from "@/hooks/use-reports-list";
import { useUserPosition } from "@/hooks/use-user-position";
import {
  REPORTS_FAB_BOTTOM_OFFSET,
  REPORTS_LIST_SCROLL_PADDING,
} from "@/lib/layout/constants";
import { fetchRouteToReport } from "@/lib/map/fetch-route";
import { useLanguage } from "@/lib/i18n/context";
import type { RouteBuildState } from "@/types/map-route";
import type { ReportListItem, ReportsListScope } from "@/types/report";

export function ReportsScreen() {
  const { t } = useLanguage();
  const { position: userPosition, error: geoError } = useUserPosition();
  const userLat = userPosition?.[0] ?? null;
  const userLng = userPosition?.[1] ?? null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [section, setSection] = useState<ReportsListScope>("active");

  const activeListState = useReportsList(userLat, userLng, refreshKey, "active");
  const completedListState = useReportsList(userLat, userLng, refreshKey, "completed");

  const listState = section === "active" ? activeListState : completedListState;

  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [routeState, setRouteState] = useState<RouteBuildState>({ status: "idle" });
  const [createDraft, setCreateDraft] = useState<CreateReportDraft | null>(null);

  const isCompletedView =
    section === "completed" || Boolean(selectedReport?.cleaned_at);

  const handlePhotoCapture = useCallback((file: File) => {
    setSelectedReport(null);
    setRouteState({ status: "idle" });
    setCreateDraft({ file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const handleCloseCreate = useCallback(() => {
    setCreateDraft((draft) => {
      if (draft) URL.revokeObjectURL(draft.previewUrl);
      return null;
    });
  }, []);

  const handleReportSubmitted = useCallback(() => {
    handleCloseCreate();
    setRefreshKey((k) => k + 1);
  }, [handleCloseCreate]);

  const handleBuildRoute = useCallback(async () => {
    if (!selectedReport) return;
    if (!userPosition) {
      setRouteState({ status: "error", message: t.home.enableGeoRoute });
      return;
    }
    setRouteState({ status: "loading" });
    const result = await fetchRouteToReport({
      fromLat: userPosition[0],
      fromLng: userPosition[1],
      toLat: selectedReport.lat,
      toLng: selectedReport.lng,
      reportId: selectedReport.id,
    });
    if (result.ok) {
      setRouteState({ status: "ready", route: result.route });
    } else {
      setRouteState({ status: "error", message: result.message });
    }
  }, [selectedReport, userPosition, t]);

  const handleClearRoute = useCallback(() => {
    setRouteState({ status: "idle" });
  }, []);

  const handleSectionChange = useCallback((next: ReportsListScope) => {
    setSection(next);
    setSelectedReport(null);
    setRouteState({ status: "idle" });
  }, []);

  const handleCleanupSubmitted = useCallback(() => {
    setSelectedReport(null);
    setRouteState({ status: "idle" });
    setRefreshKey((k) => k + 1);
    setSection("completed");
  }, []);

  const sectionSubtitle =
    section === "active" ? t.reports.activeSubtitle : t.reports.completedSubtitle;

  const emptyMessage =
    section === "active" ? t.reports.emptyActive : t.reports.emptyCompleted;

  return (
    <>
      <header className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h1 className="text-xl font-bold text-steppe-deep">{t.reports.title}</h1>
        <p className="mt-0.5 text-sm text-steppe-deep/50">
          {sectionSubtitle}
          {userPosition && section === "active" ? t.reports.sortByDistance : ""}
        </p>
        {geoError ? (
          <p className="mt-1.5 text-xs text-steppe-deep/40">{geoError}</p>
        ) : null}
        <ReportsSectionTabs active={section} onChange={handleSectionChange} />
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: REPORTS_LIST_SCROLL_PADDING }}
      >
        {selectedReport ? (
          <div className="flex min-h-full flex-col">
            <div className="flex items-center justify-between px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setRouteState({ status: "idle" });
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-steppe-mid transition active:opacity-70"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M10 4L6 8l4 4" />
                </svg>
                {section === "active" ? t.reports.activeTab : t.reports.completedTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setRouteState({ status: "idle" });
                }}
                aria-label={t.common.close}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-steppe-deep/50"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <ReportDetailContent
              report={selectedReport}
              routeState={routeState}
              userPosition={userPosition}
              onBuildRoute={handleBuildRoute}
              onClearRoute={handleClearRoute}
              isCompleted={isCompletedView}
              onCleanupSubmitted={handleCleanupSubmitted}
              onDismissedNatural={() => {
                setSelectedReport(null);
                setRouteState({ status: "idle" });
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        ) : (
          <NearbyReportsList
            state={listState}
            scope={section}
            onSelectReport={setSelectedReport}
            emptyMessage={emptyMessage}
          />
        )}
      </div>

      {section === "active" && !createDraft && !selectedReport ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-20 flex justify-center"
          style={{ bottom: REPORTS_FAB_BOTTOM_OFFSET }}
        >
          <div className="pointer-events-auto">
            <CameraCaptureButton
              variant="fab"
              label={t.reports.newReport}
              onPhoto={handlePhotoCapture}
            />
          </div>
        </div>
      ) : null}

      {createDraft ? (
        <CreateReportScreen
          draft={createDraft}
          userPosition={userPosition}
          onClose={handleCloseCreate}
          onSubmitted={handleReportSubmitted}
        />
      ) : null}
    </>
  );
}
