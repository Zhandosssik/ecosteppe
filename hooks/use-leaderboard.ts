"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardPayload } from "@/types/leaderboard";

const CLIENT_CACHE_MS = 45_000;
const STORAGE_KEY = "ecosteppe:leaderboard:v4";

type CacheEntry = {
  data: LeaderboardPayload;
  storedAt: number;
};

function readSessionCache(): CacheEntry | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.storedAt > CLIENT_CACHE_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(data: LeaderboardPayload) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const entry: CacheEntry = { data, storedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Пустой ответ сервера");
  }
  return JSON.parse(text) as T;
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardPayload | null>(() =>
    readSessionCache()?.data ?? null,
  );
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (refresh) {
      setRefreshing(true);
    } else if (!data) {
      setLoading(true);
    }
    setError(null);

    try {
      const url = refresh ? "/api/leaderboard?refresh=1" : "/api/leaderboard";
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (requestId !== requestIdRef.current) return;

      if (!res.ok) {
        const errJson = await parseJsonResponse<{ error?: string }>(res).catch(
          () => ({ error: undefined }),
        );
        throw new Error(errJson.error ?? "Ошибка загрузки рейтинга");
      }

      const json = await parseJsonResponse<
        LeaderboardPayload & { error?: string }
      >(res);

      if (requestId !== requestIdRef.current) return;

      setData(json);
      writeSessionCache(json);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    void load(false);
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  const joinTeam = useCallback(
    async (teamId: string) => {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const json = (await res.json()) as { error?: string; teamId?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Не удалось вступить");
      }
      await load(true);
      return json.teamId ?? teamId;
    },
    [load],
  );

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    joinTeam,
  };
}
