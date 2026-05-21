"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarBadge } from "@/components/rating/AvatarBadge";
import { getLevelFromXp } from "@/lib/game/levels";
import { ScheduleCleanupDialog } from "@/components/teams/ScheduleCleanupDialog";
import { TeamCalendar } from "@/components/teams/TeamCalendar";
import { TeamChat } from "@/components/teams/TeamChat";
import type { TeamDetailPayload } from "@/types/teams";

export function TeamDetailScreen({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [data, setData] = useState<TeamDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [joining, setJoining] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!data) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const text = await res.text();
      if (requestId !== requestIdRef.current) return;
      if (!text.trim()) {
        throw new Error("Пустой ответ сервера");
      }
      const json = JSON.parse(text) as TeamDetailPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      if (requestId !== requestIdRef.current) return;
      setData(json);
      setDescDraft(json.team.description ?? "");
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
    }
  }, [teamId, data]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / teamId
  }, [teamId]);

  async function saveDescription() {
    if (!data?.meta.isCaptain) return;
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descDraft }),
      });
      const json = (await res.json()) as { team?: TeamDetailPayload["team"]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      setData((prev) =>
        prev && json.team ? { ...prev, team: { ...prev.team, ...json.team } } : prev,
      );
      setEditingDesc(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingDesc(false);
    }
  }

  async function kickMember(userId: string) {
    if (!confirm("Исключить участника из команды?")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25_000);

      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const json = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");

      await load();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Превышено время ожидания. Проверьте сеть и повторите.");
      } else {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    } finally {
      setJoining(false);
    }
  }

  if (loading && !data) {
    return (
      <p className="px-5 py-12 text-center text-sm text-steppe-deep/60">
        Загрузка команды…
      </p>
    );
  }

  if (error && !data) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 min-h-11 rounded-xl bg-steppe-deep px-4 text-sm font-semibold text-white"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { team, members, recentCleanups, upcomingEvents, meta } = data;

  return (
    <div className="space-y-6 px-5 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-11 min-w-11 rounded-xl text-steppe-deep"
          aria-label="Назад"
        >
          ←
        </button>
        <h1 className="truncate text-lg font-semibold text-steppe-deep">{team.name}</h1>
      </div>

      <section className="rounded-2xl border border-sand-dark/60 bg-white p-4">
        <div className="flex items-start gap-4">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logoUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-steppe-deep/10 text-lg font-bold">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-steppe-deep">{team.name}</p>
            <p className="text-sm text-steppe-deep/55">
              {team.memberCount}{" "}
              {team.memberCount === 1 ? "участник" : "участников"}
              {team.totalXp > 0
                ? ` · ${team.totalXp.toLocaleString("ru-RU")} XP`
                : null}
            </p>
            {team.dumpsCleared > 0 ? (
              <p className="text-xs text-steppe-mid">
                {team.dumpsCleared} подтверждённых заявок команды
              </p>
            ) : null}
          </div>
        </div>

        {meta.isCaptain && editingDesc ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-sand-dark/80 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingDesc(false)}
                className="min-h-11 flex-1 rounded-xl border text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={savingDesc}
                onClick={() => void saveDescription()}
                className="min-h-11 flex-1 rounded-xl bg-steppe-deep text-sm font-semibold text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-steppe-deep/70">
            {team.description || "Описание не добавлено"}
          </p>
        )}

        {meta.isCaptain && !editingDesc ? (
          <button
            type="button"
            onClick={() => setEditingDesc(true)}
            className="mt-2 text-xs font-semibold text-steppe-mid"
          >
            Редактировать описание
          </button>
        ) : null}

        {meta.isCaptain ? (
          <p className="mt-4 rounded-xl bg-sky px-3 py-2 text-center text-sm font-medium text-steppe-deep">
            Вы капитан и участник этой команды
          </p>
        ) : meta.isMember ? (
          <p className="mt-4 rounded-xl bg-sky/60 px-3 py-2 text-center text-sm text-steppe-deep">
            Вы в этой команде
          </p>
        ) : (
          <button
            type="button"
            disabled={joining}
            onClick={() => void handleJoin()}
            className="mt-4 min-h-11 w-full rounded-xl bg-steppe-deep text-sm font-semibold text-white disabled:opacity-60"
          >
            {joining ? "Вступление…" : "Вступить в команду"}
          </button>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-steppe-deep">Участники</h2>
        <ul className="mt-2 space-y-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-sand-dark/60 bg-white px-3 py-2"
            >
              <AvatarBadge name={m.displayName} imageUrl={m.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-steppe-deep">
                  {m.displayName}
                  {m.isCaptain ? (
                    <span className="ml-1 text-xs text-steppe-mid">капитан</span>
                  ) : null}
                </p>
                <p className="text-xs text-steppe-deep/50">
                  {getLevelFromXp(m.xp).title} · {m.xp} XP
                </p>
              </div>
              {meta.isCaptain && !m.isCaptain ? (
                <button
                  type="button"
                  onClick={() => void kickMember(m.userId)}
                  className="shrink-0 text-xs font-medium text-red-700"
                >
                  Исключить
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-steppe-deep">Недавние уборки</h2>
        {recentCleanups.length === 0 ? (
          <p className="mt-2 text-sm text-steppe-deep/55">
            Пока нет подтверждённых заявок от участников
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recentCleanups.map((c) => (
              <li
                key={c.id}
                className="flex gap-3 rounded-xl border border-sand-dark/60 bg-white p-2"
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-sand" />
                )}
                <div>
                  <p className="text-sm font-medium text-steppe-deep">
                    {c.title ?? "Уборка"}
                  </p>
                  <p className="text-xs text-steppe-deep/50">
                    {new Date(c.clearedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {meta.isMember ? (
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="min-h-11 w-full rounded-xl border border-steppe-mid/40 bg-white text-sm font-semibold text-steppe-deep"
        >
          Запланировать уборку
        </button>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-steppe-deep">Чат команды</h2>
        <div className="mt-2">
          <TeamChat teamId={teamId} enabled={meta.isMember} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-steppe-deep">
          Календарь уборок
        </h2>
        <div className="mt-2">
          <TeamCalendar events={upcomingEvents} />
        </div>
      </section>

      <Link
        href="/"
        className="block text-center text-xs font-medium text-steppe-mid"
      >
        Открыть карту свалок →
      </Link>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <ScheduleCleanupDialog
        open={scheduleOpen}
        teamId={teamId}
        onClose={() => setScheduleOpen(false)}
        onScheduled={() => void load()}
      />
    </div>
  );
}
