"use client";

import { useEffect, useState } from "react";
import { getUserPosition } from "@/lib/map/geolocation";

export function useUserPosition() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUserPosition().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPosition([result.position.lat, result.position.lng]);
        setError(null);
      } else {
        setError(result.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { position, error };
}
