"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomPanel } from "@/components/home/BottomPanel";
import {
  CreateReportScreen,
  type CreateReportDraft,
} from "@/components/report/CreateReportScreen";
import type { MapFlyTarget } from "@/components/map/LeafletMap";
import { MapSection } from "@/components/map/MapSection";
import { BottomNav } from "@/components/nav/BottomNav";
import { useNearbyReports } from "@/hooks/use-nearby-reports";
import { fetchRouteToReport } from "@/lib/map/fetch-route";
import type { PanelMode, PanelSnap } from "@/lib/layout/panel-snaps";
import type { RouteBuildState } from "@/types/map-route";
import type { NearbyReport, ReportListItem } from "@/types/report";

export function HomeScreen() {
  const [panelSnap, setPanelSnap] = useState<PanelSnap>("split");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  const [flyTarget, setFlyTarget] = useState<MapFlyTarget | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(
    null,
  );
  const [routeState, setRouteState] = useState<RouteBuildState>({
    status: "idle",
  });
  const [createDraft, setCreateDraft] = useState<CreateReportDraft | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  const userLat = userPosition?.[0] ?? null;
  const userLng = userPosition?.[1] ?? null;
  const nearbyState = useNearbyReports(userLat, userLng, reportsRefreshKey);

  const reports = useMemo(
    () => (nearbyState.status === "ready" ? nearbyState.reports : []),
    [nearbyState],
  );

  const panelMode: PanelMode = selectedReport ? "detail" : "list";
  const layoutKey = `panel-${panelSnap}-${panelMode}`;

  const routePositions = useMemo(() => {
    if (routeState.status === "ready") return routeState.route.positions;
    return null;
  }, [routeState]);

  useEffect(() => {
    setRouteState((prev) => {
      if (!selectedReport) return { status: "idle" };
      if (
        prev.status === "ready" &&
        prev.route.reportId !== selectedReport.id
      ) {
        return { status: "idle" };
      }
      return prev;
    });
  }, [selectedReport?.id]);

  const handleSelectReport = useCallback((report: ReportListItem) => {
    setFlyTarget({
      lat: report.lat,
      lng: report.lng,
      key: Date.now(),
    });
    setSelectedReport(report);
    setPanelSnap((snap) => (snap === "peek" ? "split" : snap));
  }, []);

  const handleClearSelectedReport = useCallback(() => {
    setSelectedReport(null);
    setRouteState({ status: "idle" });
  }, []);

  const handleBuildRoute = useCallback(async () => {
    if (!selectedReport) return;

    if (!userPosition) {
      setRouteState({
        status: "error",
        message:
          "Включите геолокацию, чтобы построить маршрут от вашего местоположения",
      });
      return;
    }

    setRouteState({ status: "loading" });
    setPanelSnap("peek");

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
  }, [selectedReport, userPosition]);

  const handleClearRoute = useCallback(() => {
    setRouteState({ status: "idle" });
  }, []);

  const handleClearReportFocus = useCallback(() => {
    setFlyTarget(null);
  }, []);

  const handleMapInteract = useCallback(() => {
    setPanelSnap("peek");
  }, []);

  const handlePhotoCapture = useCallback((file: File) => {
    setSelectedReport(null);
    setRouteState({ status: "idle" });
    setCreateDraft({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }, []);

  const handleCloseCreate = useCallback(() => {
    setCreateDraft((draft) => {
      if (draft) URL.revokeObjectURL(draft.previewUrl);
      return null;
    });
  }, []);

  const handleReportSubmitted = useCallback(() => {
    handleCloseCreate();
    setReportsRefreshKey((k) => k + 1);
  }, [handleCloseCreate]);

  return (
    <main className="relative h-dvh max-h-dvh overflow-hidden">
      <MapSection
        className="absolute inset-0"
        panelSnap={panelSnap}
        panelMode={panelMode}
        layoutKey={layoutKey}
        geoError={geoError}
        reports={reports}
        flyTarget={flyTarget}
        routePositions={routePositions}
        onGeoError={setGeoError}
        onUserPositionChange={setUserPosition}
        onClearReportFocus={handleClearReportFocus}
        onMapInteract={panelSnap === "peek" ? undefined : handleMapInteract}
        onPhotoCapture={handlePhotoCapture}
      />

      {createDraft ? (
        <CreateReportScreen
          draft={createDraft}
          userPosition={userPosition}
          onClose={handleCloseCreate}
          onSubmitted={handleReportSubmitted}
        />
      ) : null}

      <BottomPanel
        panelSnap={panelSnap}
        panelMode={panelMode}
        nearbyState={nearbyState}
        selectedReport={selectedReport}
        onPanelSnapChange={setPanelSnap}
        onSelectReport={handleSelectReport}
        onClearSelectedReport={handleClearSelectedReport}
        routeState={routeState}
        userPosition={userPosition}
        onBuildRoute={handleBuildRoute}
        onClearRoute={handleClearRoute}
        onCleanupSubmitted={() => setReportsRefreshKey((k) => k + 1)}
        onDismissedNatural={() => {
          setSelectedReport(null);
          setReportsRefreshKey((k) => k + 1);
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-30">
        <BottomNav activeTab="home" />
      </div>
    </main>
  );
}
