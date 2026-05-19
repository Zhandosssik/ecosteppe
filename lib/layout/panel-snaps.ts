import { BOTTOM_NAV_OFFSET, DETAIL_PANEL_PEEK } from "@/lib/layout/constants";

export type PanelSnap = "peek" | "split" | "full";

export type PanelMode = "list" | "detail";

const PEEK_PX = 52;
const FULL_RATIO = 0.92;

/** Стабильные высоты для SSR и гидратации (без window) */
export const PANEL_SNAP_HEIGHT_CSS: Record<
  PanelMode,
  Record<PanelSnap, string>
> = {
  list: {
    peek: DETAIL_PANEL_PEEK,
    split: "48dvh",
    full: "calc(92dvh - var(--bottom-nav-offset))",
  },
  detail: {
    peek: DETAIL_PANEL_PEEK,
    split: "33dvh",
    full: "calc(92dvh - var(--bottom-nav-offset))",
  },
};

export const PANEL_LOCATE_BOTTOM_CSS: Record<
  PanelMode,
  Record<PanelSnap, string>
> = {
  list: {
    peek: `calc(${DETAIL_PANEL_PEEK} + ${BOTTOM_NAV_OFFSET} + 0.75rem)`,
    split: `calc(48dvh + ${BOTTOM_NAV_OFFSET} + 0.75rem)`,
    full: `calc(92dvh + 0.75rem)`,
  },
  detail: {
    peek: `calc(${DETAIL_PANEL_PEEK} + ${BOTTOM_NAV_OFFSET} + 0.75rem)`,
    split: `calc(33dvh + ${BOTTOM_NAV_OFFSET} + 0.75rem)`,
    full: `calc(92dvh + 0.75rem)`,
  },
};

export function getNavOffsetPx(): number {
  if (typeof window === "undefined") return 72;
  const nav = document.querySelector("[data-bottom-nav]");
  if (nav) return nav.getBoundingClientRect().height;
  return 72;
}

export function getAvailableHeightPx(): number {
  if (typeof window === "undefined") return 600;
  return window.innerHeight - getNavOffsetPx();
}

export function getSnapHeightsPx(mode: PanelMode): Record<PanelSnap, number> {
  const available = getAvailableHeightPx();
  const splitRatio = mode === "detail" ? 0.33 : 0.48;

  return {
    peek: PEEK_PX,
    split: Math.round(available * splitRatio),
    full: Math.round(available * FULL_RATIO),
  };
}

export function snapFromHeight(heightPx: number, mode: PanelMode): PanelSnap {
  const snaps = getSnapHeightsPx(mode);
  const entries: PanelSnap[] = ["peek", "split", "full"];

  let nearest: PanelSnap = "split";
  let minDist = Infinity;

  for (const key of entries) {
    const dist = Math.abs(heightPx - snaps[key]);
    if (dist < minDist) {
      minDist = dist;
      nearest = key;
    }
  }

  return nearest;
}

export function peekHeightCss(): string {
  return DETAIL_PANEL_PEEK;
}
