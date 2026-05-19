"use client";

import dynamic from "next/dynamic";
import type { MapFlyTarget } from "@/components/map/LeafletMap";
import type { MapApi } from "@/components/map/map-api";
import type { NearbyReport } from "@/types/report";

const LeafletMap = dynamic(
  () =>
    import("@/components/map/LeafletMap").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#e8efe6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-steppe-mid border-t-transparent" />
      </div>
    ),
  },
);

type MapViewProps = {
  layoutKey: string;
  reports: NearbyReport[];
  flyTarget: MapFlyTarget | null;
  routePositions: [number, number][] | null;
  onMapReady: (api: MapApi) => void;
  onGeoError?: (message: string | null) => void;
  onUserPositionChange?: (position: [number, number] | null) => void;
  onMapInteract?: () => void;
};

export function MapView(props: MapViewProps) {
  return <LeafletMap {...props} />;
}
