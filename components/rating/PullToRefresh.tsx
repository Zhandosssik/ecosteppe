"use client";

import { useCallback, useRef, type ReactNode } from "react";

const PULL_THRESHOLD = 72;

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  children: ReactNode;
};

export function PullToRefresh({
  onRefresh,
  refreshing,
  children,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setOffset = useCallback((px: number) => {
    offsetRef.current = px;
    if (indicatorRef.current) {
      indicatorRef.current.style.height = `${px}px`;
      indicatorRef.current.style.opacity = px > 0 ? String(Math.min(1, px / PULL_THRESHOLD)) : "0";
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      pulling.current = false;
      setOffset(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      const offset = Math.min(delta * 0.45, PULL_THRESHOLD + 16);
      setOffset(offset);
      if (delta > 10) {
        e.preventDefault();
      }
    }
  }, [refreshing, setOffset]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = offsetRef.current >= PULL_THRESHOLD;
    setOffset(0);
    if (shouldRefresh && !refreshing) {
      await onRefresh();
    }
  }, [onRefresh, refreshing, setOffset]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={indicatorRef}
        className="flex items-end justify-center overflow-hidden text-xs font-medium text-steppe-mid transition-opacity"
        style={{ height: 0, opacity: 0 }}
        aria-hidden={!refreshing}
      >
        {refreshing ? (
          <span className="pb-2">Обновление…</span>
        ) : (
          <span className="pb-2">Потяните вниз для обновления</span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => void onTouchEnd()}
      >
        {children}
      </div>
    </div>
  );
}
