"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { DEFAULT_MAP_ZOOM } from "@/lib/map/location";
import { formatCoordinates } from "@/lib/geo/format-distance";
import "leaflet/dist/leaflet.css";

const pickIcon = L.divIcon({
  className: "",
  html: `<span class="pick-location-marker"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickPicker({
  position,
  onPick,
}: {
  position: [number, number];
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: false });
  }, [map, position]);

  return null;
}

type ReportPickMapProps = {
  initialCenter: [number, number];
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
};

export function ReportPickMap({
  initialCenter,
  position,
  onPositionChange,
}: ReportPickMapProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-44 items-center justify-center rounded-2xl bg-[#e8efe6]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-steppe-mid border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-steppe-deep/10">
      <div className="relative h-44 w-full">
        <MapContainer
          center={initialCenter}
          zoom={DEFAULT_MAP_ZOOM}
          className="z-0 h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={position} icon={pickIcon} />
          <MapClickPicker position={position} onPick={onPositionChange} />
        </MapContainer>
      </div>
      <p className="bg-white px-3 py-2 text-center text-[11px] text-steppe-deep/55">
        Нажмите на карту, чтобы отметить точку ·{" "}
        {formatCoordinates(position[0], position[1])}
      </p>
    </div>
  );
}
