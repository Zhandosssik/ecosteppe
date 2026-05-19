"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { NearbyReportsList } from "@/components/report/NearbyReportsList";
import { ReportDetailContent } from "@/components/report/ReportDetailContent";
import type { NearbyState } from "@/hooks/use-nearby-reports";
import { BOTTOM_NAV_OFFSET } from "@/lib/layout/constants";
import {
  getSnapHeightsPx,
  PANEL_SNAP_HEIGHT_CSS,
  snapFromHeight,
  type PanelMode,
  type PanelSnap,
} from "@/lib/layout/panel-snaps";
import type { RouteBuildState } from "@/types/map-route";
import type { NearbyReport } from "@/types/report";

type BottomPanelProps = {
  panelSnap: PanelSnap;
  panelMode: PanelMode;
  nearbyState: NearbyState;
  selectedReport: NearbyReport | null;
  routeState: RouteBuildState;
  userPosition: [number, number] | null;
  onPanelSnapChange: (snap: PanelSnap) => void;
  onSelectReport: (report: NearbyReport) => void;
  onClearSelectedReport: () => void;
  onBuildRoute: () => void;
  onClearRoute: () => void;
};

export function BottomPanel({
  panelSnap,
  panelMode,
  nearbyState,
  selectedReport,
  onPanelSnapChange,
  onSelectReport,
  onClearSelectedReport,
  routeState,
  userPosition,
  onBuildRoute,
  onClearRoute,
}: BottomPanelProps) {
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dragging = useRef(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragHeightPx, setDragHeightPx] = useState<number | null>(null);

  const isDetailView = panelMode === "detail" && selectedReport !== null;

  const snapHeightsPx = getSnapHeightsPx(panelMode);
  const settledHeightCss = PANEL_SNAP_HEIGHT_CSS[panelMode][panelSnap];

  const resetDrag = useCallback(() => {
    dragging.current = false;
    setDragActive(false);
    setDragHeightPx(null);
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    setDragActive(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = dragHeightPx ?? snapHeightsPx[panelSnap];
    setDragHeightPx(dragStartHeight.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;

    const delta = e.clientY - dragStartY.current;
    const minH = snapHeightsPx.peek;
    const maxH = snapHeightsPx.full;
    const next = Math.round(
      Math.min(maxH, Math.max(minH, dragStartHeight.current - delta)),
    );
    setDragHeightPx(next);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;

    const delta = e.clientY - dragStartY.current;
    const finalHeight = Math.round(
      Math.min(
        snapHeightsPx.full,
        Math.max(snapHeightsPx.peek, dragStartHeight.current - delta),
      ),
    );

    resetDrag();
    void delta;
    onPanelSnapChange(snapFromHeight(finalHeight, panelMode));
  };

  const reportCount =
    nearbyState.status === "ready" ? nearbyState.reports.length : null;

  const handleHint =
    panelSnap === "peek"
      ? "Потяните вверх — открыть панель"
      : panelSnap === "full"
        ? "Потяните вниз — карта или меньше"
        : isDetailView
          ? "Потяните вверх — на весь экран · вниз — карта или список"
          : "Потяните вверх — на весь экран · вниз — карта";

  const chevronRotated = panelSnap === "peek";

  return (
    <section
      className={`absolute inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-3xl bg-sand shadow-[0_-8px_32px_rgba(27,67,50,0.08)] ring-1 ring-sand-dark/60 ease-out ${
        dragActive ? "transition-none" : "transition-[height] duration-300"
      }`}
      style={{
        bottom: BOTTOM_NAV_OFFSET,
        height: dragHeightPx ?? settledHeightCss,
      }}
    >
      {isDetailView ? (
        <button
          type="button"
          onClick={onClearSelectedReport}
          aria-label="Закрыть"
          className="absolute top-3 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-steppe-deep/55 ring-1 ring-steppe-deep/10 shadow-sm transition active:scale-95"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : null}

      <div
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        aria-hidden
        className={`flex w-full shrink-0 touch-none flex-col items-center pt-2 pb-1 select-none ${
          dragActive ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <span className="h-1 w-10 rounded-full bg-sand-dark/80" />
        <span
          className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-steppe-deep/50 ${
            chevronRotated ? "" : "rotate-180"
          } ${dragActive ? "" : "transition-transform duration-300"}`}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </span>
        <span className="px-4 text-center text-[10px] font-medium text-steppe-deep/45">
          {handleHint}
        </span>
      </div>

      {isDetailView ? (
        <ReportDetailContent
          report={selectedReport}
          onBackToList={onClearSelectedReport}
          routeState={routeState}
          userPosition={userPosition}
          onBuildRoute={onBuildRoute}
          onClearRoute={onClearRoute}
        />
      ) : (
        <>
          <header className="shrink-0 px-5 pt-1 pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-steppe-deep">
                Ближайшие зоны
              </h2>
              {reportCount !== null && (
                <span className="text-xs font-medium text-steppe-deep/45">
                  {reportCount === 0 ? "нет заявок" : `${reportCount} шт.`}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-steppe-deep/55">
              Сортировка по расстоянию от вас — чем ближе, тем выше в списке
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <NearbyReportsList
              state={nearbyState}
              onSelectReport={onSelectReport}
            />
          </div>
        </>
      )}
    </section>
  );
}
