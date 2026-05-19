"use client";

import { useEffect, useState } from "react";
import type { NearbyReport } from "@/types/report";

export type NearbyState =
  | { status: "idle" }
  | { status: "waiting_geo" }
  | { status: "loading" }
  | { status: "ready"; reports: NearbyReport[] }
  | { status: "error"; message: string };

export function useNearbyReports(
  userLat: number | null,
  userLng: number | null,
  refreshKey = 0,
): NearbyState {
  const [state, setState] = useState<NearbyState>({ status: "idle" });

  useEffect(() => {
    if (userLat === null || userLng === null) {
      setState({ status: "waiting_geo" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    const params = new URLSearchParams({
      lat: String(userLat),
      lng: String(userLng),
    });

    fetch(`/api/reports/nearby?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as {
          reports?: NearbyReport[];
          error?: string;
          detail?: string;
        };
        if (!res.ok) {
          const msg = body.detail
            ? `${body.error ?? "Ошибка загрузки"}: ${body.detail}`
            : (body.error ?? "Ошибка загрузки");
          throw new Error(msg);
        }
        setState({ status: "ready", reports: body.reports ?? [] });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Ошибка загрузки заявок";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, [userLat, userLng, refreshKey]);

  return state;
}
