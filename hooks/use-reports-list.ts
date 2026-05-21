"use client";

import { useEffect, useState } from "react";
import type { ReportListItem, ReportsListScope } from "@/types/report";

export type ReportsListState =
  | { status: "loading" }
  | { status: "ready"; reports: ReportListItem[] }
  | { status: "error"; message: string };

export function useReportsList(
  userLat: number | null,
  userLng: number | null,
  refreshKey = 0,
  scope: ReportsListScope = "active",
): ReportsListState {
  const [state, setState] = useState<ReportsListState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    const params = new URLSearchParams({ scope });
    if (userLat !== null && userLng !== null) {
      params.set("lat", String(userLat));
      params.set("lng", String(userLng));
    }

    const query = params.toString();
    const url = query ? `/api/reports?${query}` : "/api/reports";

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as {
          reports?: ReportListItem[];
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
  }, [userLat, userLng, refreshKey, scope]);

  return state;
}
