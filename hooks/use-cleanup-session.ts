"use client";

import { useCallback, useEffect, useState } from "react";

export type ActiveCleanup = {
  reportId: string;
  startedAt: number; // unix ms
};

const KEY_ACTIVE = "eco:cleanup_active";
const KEY_DONE = "eco:cleanup_done";
const CHANGE_EVENT = "ecosteppe:cleanup_change";

function readActive(): ActiveCleanup | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(KEY_ACTIVE);
    return s ? (JSON.parse(s) as ActiveCleanup) : null;
  } catch {
    return null;
  }
}

function readDone(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(KEY_DONE);
    return s ? (JSON.parse(s) as string[]) : [];
  } catch {
    return [];
  }
}

function broadcast() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCleanupSession() {
  const [active, setActive] = useState<ActiveCleanup | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const sync = useCallback(() => {
    setActive(readActive());
    setDoneIds(readDone());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [sync]);

  const startCleanup = useCallback((reportId: string) => {
    const v: ActiveCleanup = { reportId, startedAt: Date.now() };
    localStorage.setItem(KEY_ACTIVE, JSON.stringify(v));
    broadcast();
  }, []);

  const finishCleanup = useCallback((reportId: string) => {
    localStorage.removeItem(KEY_ACTIVE);
    const next = [...readDone(), reportId];
    localStorage.setItem(KEY_DONE, JSON.stringify(next));
    broadcast();
  }, []);

  const cancelCleanup = useCallback(() => {
    localStorage.removeItem(KEY_ACTIVE);
    broadcast();
  }, []);

  return { active, doneIds, startCleanup, finishCleanup, cancelCleanup };
}
