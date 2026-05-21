"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { TeamListCard } from "@/components/teams/TeamListCard";
import { useLanguage } from "@/lib/i18n/context";
import type { TeamSummary } from "@/types/teams";

export function TeamsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadMy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const json = (await res.json()) as {
        myTeams?: TeamSummary[];
        currentUserId?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? t.common.error);
      setMyTeams(json.myTeams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await fetch("/api/teams/search", { cache: "no-store" });
      const json = (await res.json()) as { teams?: TeamSummary[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t.common.error);
      setAllTeams(json.teams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoadingAll(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMy();
    void loadAll();
  }, [loadMy, loadAll]);

  const myTeamId = myTeams[0]?.id;

  const browseTeams = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return allTeams.filter((team) => {
      if (team.id === myTeamId) return false;
      if (!q) return true;
      return team.name.toLowerCase().includes(q);
    });
  }, [allTeams, searchQ, myTeamId]);

  async function handleJoin(teamId: string) {
    setJoiningId(teamId);
    setError(null);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? t.common.error);
      await Promise.all([loadMy(), loadAll()]);
      router.push(`/teams/${teamId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setJoiningId(null);
    }
  }

  const hasTeam = myTeams.length > 0;

  return (
    <div className="space-y-5 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-bold text-steppe-deep">{t.teams.title}</h1>
        <p className="mt-0.5 text-sm text-steppe-deep/50">{t.teams.subtitle}</p>
      </header>

      {!hasTeam ? (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="min-h-12 w-full rounded-xl bg-steppe-deep text-sm font-bold text-white transition active:scale-[0.98]"
        >
          {t.teams.createTeam}
        </button>
      ) : null}

      <section>
        <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
          {t.teams.myTeams}
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-steppe-deep/50">{t.teams.loading}</p>
        ) : myTeams.length === 0 ? (
          <p className="mt-3 text-sm text-steppe-deep/50">{t.teams.noTeams}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {myTeams.map((team) => (
              <li key={team.id}>
                <TeamListCard team={team} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
          {t.teams.searchTeams}
        </h2>
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t.teams.searchPlaceholder}
          aria-label={t.teams.searchTeams}
          className="mt-2 min-h-11 w-full rounded-xl border border-sand-dark/70 bg-white px-3 text-steppe-deep outline-none focus:border-steppe-mid focus:ring-1 focus:ring-steppe-mid/30"
        />
        {loadingAll ? (
          <p className="mt-3 text-sm text-steppe-deep/50">{t.teams.loadingList}</p>
        ) : browseTeams.length === 0 ? (
          <p className="mt-3 text-sm text-steppe-deep/50">
            {allTeams.length === 0 ? t.teams.noOtherTeams : t.teams.notFound}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {browseTeams.map((team) => (
              <li key={team.id}>
                <TeamListCard
                  team={team}
                  action={
                    !hasTeam ? (
                      <button
                        type="button"
                        disabled={joiningId === team.id}
                        onClick={() => void handleJoin(team.id)}
                        className="min-h-11 shrink-0 rounded-xl bg-steppe-deep px-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60"
                      >
                        {joiningId === team.id ? "…" : t.teams.join}
                      </button>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <CreateTeamDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          void Promise.all([loadMy(), loadAll()]);
          router.push(`/teams/${id}`);
        }}
      />
    </div>
  );
}
