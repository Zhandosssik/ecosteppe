export type MapRoute = {
  reportId: string;
  /** [lat, lng] pairs for Leaflet Polyline */
  positions: [number, number][];
  distanceM: number;
  durationS: number;
};

export type RouteBuildState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; route: MapRoute }
  | { status: "error"; message: string };
