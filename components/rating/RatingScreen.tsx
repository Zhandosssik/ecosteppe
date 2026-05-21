"use client";

import { useState } from "react";
import { PersonalLeaderboard } from "@/components/rating/PersonalLeaderboard";
import { PullToRefresh } from "@/components/rating/PullToRefresh";
import { RatingTabs, type RatingTab } from "@/components/rating/RatingTabs";
import { TeamLeaderboard } from "@/components/rating/TeamLeaderboard";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useLanguage } from "@/lib/i18n/context";

export function RatingScreen() {
  const { t, locale } = useLanguage();
  const { data, loading, refreshing, error, refresh, joinTeam } = useLeaderboard();
  const [tab, setTab] = useState<RatingTab>("personal");

  return (
    <PullToRefresh onRefresh={refresh} refreshing={refreshing}>
      <div className="space-y-4 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header>
          <h1 className="text-xl font-bold text-steppe-deep">{t.rating.title}</h1>
          <p className="mt-0.5 text-sm text-steppe-deep/50">{t.rating.subtitle}</p>
        </header>

        {loading && !data ? (
          <p className="py-12 text-center text-sm text-steppe-deep/50">
            {t.rating.loading}
          </p>
        ) : error && !data ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-11 rounded-xl bg-steppe-deep px-5 text-sm font-semibold text-white"
            >
              {t.rating.retry}
            </button>
          </div>
        ) : data ? (
          <>
            <RatingTabs active={tab} onChange={setTab} />

            {error ? (
              <p className="text-xs text-amber-700">{error}</p>
            ) : null}

            <div role="tabpanel">
              {tab === "personal" ? (
                <PersonalLeaderboard
                  entries={data.personal}
                  currentUserId={data.meta.currentUserId}
                />
              ) : null}
              {tab === "teams" ? (
                <TeamLeaderboard
                  entries={data.teams}
                  currentTeamId={data.meta.currentTeamId}
                  onJoin={joinTeam}
                />
              ) : null}
            </div>

            <p className="text-center text-[10px] text-steppe-deep/30">
              {t.rating.updatedAt}{" "}
              {new Date(data.fetchedAt).toLocaleTimeString(
                locale === "kk" ? "kk-KZ" : "ru-RU",
                { hour: "2-digit", minute: "2-digit" },
              )}
            </p>
          </>
        ) : null}
      </div>
    </PullToRefresh>
  );
}
