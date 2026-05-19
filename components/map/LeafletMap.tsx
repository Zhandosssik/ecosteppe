"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  getProximityTier,
  type ProximityTier,
} from "@/lib/geo/proximity-tier";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map/location";
import { getUserPosition } from "@/lib/map/geolocation";
import type { MapApi } from "@/components/map/map-api";
import type { NearbyReport } from "@/types/report";
import "leaflet/dist/leaflet.css";

const USER_LOCATE_ZOOM = 15;
const REPORT_FOCUS_ZOOM = 14;

const userLocationIcon = L.divIcon({
  className: "",
  html: `<span class="user-location-marker"><span class="user-location-ping"></span><span class="user-location-dot"></span></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const trashZoneIcons: Partial<Record<ProximityTier, L.DivIcon>> = {};

function getTrashZoneIcon(tier: ProximityTier): L.DivIcon {
  const cached = trashZoneIcons[tier];
  if (cached) return cached;

  const icon = L.divIcon({
    className: "",
    html: `<span class="trash-zone-marker trash-zone-marker--tier-${tier}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  trashZoneIcons[tier] = icon;
  return icon;
}

function MapFlyTo({
  lat,
  lng,
  flyKey,
  zoom = USER_LOCATE_ZOOM,
}: {
  lat: number | null;
  lng: number | null;
  flyKey: number;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null && flyKey > 0) {
      map.flyTo([lat, lng], zoom, { duration: 0.8 });
    }
  }, [lat, lng, flyKey, zoom, map]);

  return null;
}

function MapResizeOnChange({ layoutKey }: { layoutKey: string }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 320);
    return () => window.clearTimeout(id);
  }, [layoutKey, map]);

  return null;
}

function MapRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: true });
  }, [positions, map]);

  return null;
}

function MapInteractWatcher({ onInteract }: { onInteract?: () => void }) {
  const map = useMap();
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  useEffect(() => {
    if (!onInteract) return;

    const container = map.getContainer();

    const handleInteract = () => {
      onInteractRef.current?.();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      handleInteract();
    };

    container.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    container.addEventListener("wheel", handleInteract, { passive: true });

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("wheel", handleInteract);
    };
  }, [map, onInteract]);

  return null;
}

function MapApiBridge({
  onReady,
  onLocate,
  flyToRef,
}: {
  onReady: (api: MapApi) => void;
  onLocate: () => void;
  flyToRef: MutableRefObject<(lat: number, lng: number) => void>;
}) {
  const map = useMap();
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    flyToRef.current = (lat: number, lng: number) => {
      map.flyTo([lat, lng], REPORT_FOCUS_ZOOM, { duration: 0.8 });
    };
  }, [map, flyToRef]);

  useEffect(() => {
    onReadyRef.current({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      locate: onLocate,
      flyTo: (lat, lng) => flyToRef.current(lat, lng),
    });
  }, [map, onLocate, flyToRef]);

  return null;
}

export type MapFlyTarget = {
  lat: number;
  lng: number;
  key: number;
};

type LeafletMapProps = {
  layoutKey: string;
  reports: NearbyReport[];
  flyTarget: MapFlyTarget | null;
  routePositions: [number, number][] | null;
  onMapReady: (api: MapApi) => void;
  onGeoError?: (message: string | null) => void;
  onUserPositionChange?: (position: [number, number] | null) => void;
  onMapInteract?: () => void;
};

export function LeafletMap({
  layoutKey,
  reports,
  flyTarget,
  routePositions,
  onMapReady,
  onGeoError,
  onUserPositionChange,
  onMapInteract,
}: LeafletMapProps) {
  const flyToRef = useRef<(lat: number, lng: number) => void>(() => {});
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locateFlyKey, setLocateFlyKey] = useState(0);
  const [locateFlyCenter, setLocateFlyCenter] = useState<[number, number] | null>(
    null,
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [initialGeoDone, setInitialGeoDone] = useState(false);
  const onGeoErrorRef = useRef(onGeoError);
  onGeoErrorRef.current = onGeoError;
  const onUserPositionChangeRef = useRef(onUserPositionChange);
  onUserPositionChangeRef.current = onUserPositionChange;

  const reportFlyLat = flyTarget?.lat ?? null;
  const reportFlyLng = flyTarget?.lng ?? null;
  const reportFlyKey = flyTarget?.key ?? 0;

  const requestLocation = useCallback(async (fly: boolean) => {
    setGeoLoading(true);
    onGeoErrorRef.current?.(null);

    const result = await getUserPosition();
    setGeoLoading(false);

    if (!result.ok) {
      onGeoErrorRef.current?.(result.message);
      onUserPositionChangeRef.current?.(null);
      return;
    }

    const coords: [number, number] = [
      result.position.lat,
      result.position.lng,
    ];
    setUserPosition(coords);
    onUserPositionChangeRef.current?.(coords);
    setAccuracy(result.position.accuracy);
    if (fly) {
      setLocateFlyCenter(coords);
      setLocateFlyKey((k) => k + 1);
    }
  }, []);

  const handleLocate = useCallback(() => {
    void requestLocation(true);
  }, [requestLocation]);

  useEffect(() => {
    void requestLocation(true).finally(() => setInitialGeoDone(true));
  }, [requestLocation]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="z-0 h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePositions && routePositions.length > 1 ? (
          <>
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#1b4332",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <MapRouteBounds positions={routePositions} />
          </>
        ) : null}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={getTrashZoneIcon(getProximityTier(report.distance_km))}
          />
        ))}
        {userPosition && (
          <>
            <Marker position={userPosition} icon={userLocationIcon} />
            {accuracy !== null && accuracy < 120 && (
              <Circle
                center={userPosition}
                radius={accuracy}
                pathOptions={{
                  color: "#2d6a4f",
                  fillColor: "#52b788",
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              />
            )}
          </>
        )}
        <MapFlyTo
          lat={locateFlyCenter?.[0] ?? null}
          lng={locateFlyCenter?.[1] ?? null}
          flyKey={locateFlyKey}
        />
        <MapFlyTo
          lat={reportFlyLat}
          lng={reportFlyLng}
          flyKey={reportFlyKey}
          zoom={REPORT_FOCUS_ZOOM}
        />
        <MapResizeOnChange layoutKey={layoutKey} />
        {onMapInteract ? <MapInteractWatcher onInteract={onMapInteract} /> : null}
        <MapApiBridge
          onReady={onMapReady}
          onLocate={handleLocate}
          flyToRef={flyToRef}
        />
      </MapContainer>

      {geoLoading && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs text-steppe-deep/70 shadow-sm">
          {initialGeoDone
            ? "Обновляем местоположение…"
            : "Определяем местоположение…"}
        </div>
      )}
    </div>
  );
}
