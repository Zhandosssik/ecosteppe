"use client";

import { useCallback, useRef } from "react";
import { CameraCaptureButton } from "@/components/camera/CameraCaptureButton";
import type { MapFlyTarget } from "@/components/map/LeafletMap";
import { LocateMeButton } from "@/components/map/LocateMeButton";
import { MapView } from "@/components/map/MapView";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import type { MapApi } from "@/components/map/map-api";
import {
  PANEL_LOCATE_BOTTOM_CSS,
  type PanelMode,
  type PanelSnap,
} from "@/lib/layout/panel-snaps";
import type { NearbyReport } from "@/types/report";

type MapSectionProps = {
  className?: string;
  panelSnap: PanelSnap;
  panelMode: PanelMode;
  layoutKey: string;
  geoError: string | null;
  reports: NearbyReport[];
  flyTarget: MapFlyTarget | null;
  routePositions: [number, number][] | null;
  onGeoError: (message: string | null) => void;
  onUserPositionChange: (position: [number, number] | null) => void;
  onClearReportFocus?: () => void;
  onMapInteract?: () => void;
  onPhotoCapture: (file: File) => void;
};

export function MapSection({
  className = "",
  panelSnap,
  panelMode,
  layoutKey,
  geoError,
  reports,
  flyTarget,
  routePositions,
  onGeoError,
  onUserPositionChange,
  onClearReportFocus,
  onMapInteract,
  onPhotoCapture,
}: MapSectionProps) {
  const mapApiRef = useRef<MapApi | null>(null);

  const handleMapReady = useCallback((api: MapApi) => {
    mapApiRef.current = api;
  }, []);

  const handleLocate = () => {
    onClearReportFocus?.();
    mapApiRef.current?.locate();
  };
  const handleZoomIn = () => mapApiRef.current?.zoomIn();
  const handleZoomOut = () => mapApiRef.current?.zoomOut();

  const mapMaximized = panelSnap === "peek";
  const locateBottom = PANEL_LOCATE_BOTTOM_CSS[panelMode][panelSnap];

  return (
    <section
      className={`relative h-full min-h-0 w-full overflow-hidden ${className}`}
    >
      <div className="absolute inset-0">
        <MapView
          layoutKey={layoutKey}
          reports={reports}
          flyTarget={flyTarget}
          routePositions={routePositions}
          onMapReady={handleMapReady}
          onGeoError={onGeoError}
          onUserPositionChange={onUserPositionChange}
          onMapInteract={onMapInteract}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto">
            <CameraCaptureButton onPhoto={onPhotoCapture} />
          </div>
          <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-steppe-deep shadow-sm backdrop-blur-sm">
            Казахстан
          </div>
        </div>

        {geoError && (
          <div className="pointer-events-auto absolute inset-x-4 top-[max(4.5rem,env(safe-area-inset-top)+3.5rem)] rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 shadow-sm ring-1 ring-red-200/80">
            {geoError}
          </div>
        )}

        {mapMaximized && (
          <div className="pointer-events-auto absolute top-1/2 right-4 -translate-y-1/2">
            <MapZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </div>
        )}

        <div
          className="pointer-events-auto absolute right-4"
          style={{ bottom: locateBottom }}
        >
          <LocateMeButton onClick={handleLocate} />
        </div>
      </div>
    </section>
  );
}
