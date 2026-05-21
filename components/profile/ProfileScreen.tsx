"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileAvatarPicker } from "@/components/profile/ProfileAvatarPicker";
import { useProfile } from "@/hooks/use-profile";
import { getOfflineQueueCount } from "@/lib/profile/offline-queue";
import { syncOfflineReportQueue } from "@/lib/profile/sync-offline-queue";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import type { ProfileLocale } from "@/types/profile";

function formatXp(xp: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-RU").format(xp);
}

const LOCALE_OPTIONS: { value: Locale; label: string; native: string }[] = [
  { value: "ru", label: "Русский", native: "Рус" },
  { value: "kk", label: "Қазақша", native: "Қаз" },
];

export function ProfileScreen() {
  const { user, loading: authLoading, configured, openAuth, signOut } = useAuth();
  const { state, syncing, reload, patchSettings, uploadAvatar, applyVolunteer } =
    useProfile();
  const { t, locale, setLocale } = useLanguage();

  const [offlineCount, setOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshOfflineCount = useCallback(() => {
    setOfflineCount(getOfflineQueueCount());
  }, []);

  useEffect(() => {
    refreshOfflineCount();
    const onStorage = () => refreshOfflineCount();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshOfflineCount]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleSyncOffline = async () => {
    setSyncingOffline(true);
    setOfflineMessage(null);
    const result = await syncOfflineReportQueue();
    refreshOfflineCount();
    setSyncingOffline(false);
    if (result.sent > 0) void reload({ silent: true });
    if (result.sent === 0 && result.failed === 0) {
      setOfflineMessage(t.profile.nothingToSync);
    } else if (result.sent > 0) {
      setOfflineMessage(t.profile.synced(result.sent));
    } else {
      setOfflineMessage(result.errors[0] ?? t.common.error);
    }
  };

  const handleShareReferral = async (url: string) => {
    const text = t.profile.referralText;
    try {
      if (navigator.share) {
        await navigator.share({ title: "EcoSteppe", text, url });
        return;
      }
    } catch { /* fallback */ }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.profile.linkCopied);
    } catch {
      setToast(url);
    }
  };

  const handleLocaleChange = async (newLocale: Locale) => {
    setLocale(newLocale);
    const profileLocale = newLocale as ProfileLocale;
    const r = await patchSettings({ locale: profileLocale });
    if (r.ok) setToast(t.profile.languageSaved);
  };

  if (!configured) {
    return (
      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t.profile.supabaseNotConfigured}
      </div>
    );
  }

  if (authLoading) {
    return <p className="mt-6 text-sm text-steppe-deep/50">{t.profile.loading}</p>;
  }

  if (!user) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm leading-relaxed text-steppe-deep/55">
          {t.profile.loginPrompt}
        </p>
        <button
          type="button"
          onClick={() => openAuth("login")}
          className={btnPrimary}
        >
          {t.profile.loginBtn}
        </button>
        <button
          type="button"
          onClick={() => openAuth("register")}
          className={btnOutline}
        >
          {t.profile.registerBtn}
        </button>
      </div>
    );
  }

  if (state.status === "loading") {
    return <p className="mt-6 text-sm text-steppe-deep/50">{t.profile.loadingData}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-red-600">{state.message}</p>
        <button type="button" onClick={() => void reload()} className={btnOutline}>
          {t.profile.retry}
        </button>
      </div>
    );
  }

  if (state.status !== "ready") return null;

  const data = state.data;
  const earnedBadges = data.badges.filter((b) => b.earned);

  const volunteerLabel =
    data.volunteerStatus === "approved"
      ? t.profile.volunteerApproved
      : data.volunteerStatus === "pending"
        ? t.profile.volunteerPending
        : data.volunteerStatus === "rejected"
          ? t.profile.volunteerRejected
          : null;

  return (
    <div className="mt-4 space-y-3 pb-4">
      {toast ? (
        <div className="rounded-xl bg-steppe-deep px-4 py-2.5 text-center text-xs font-medium text-white">
          {toast}
        </div>
      ) : null}

      {/* Profile card */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-steppe-deep/6">
        <div className="flex gap-4">
          <ProfileAvatarPicker
            displayName={data.displayName}
            avatarUrl={data.avatarUrl}
            disabled={syncing}
            onPick={(file) => {
              void uploadAvatar(file).then((r) => {
                if (r.ok) setToast(t.profile.photoUpdated);
                else setToast(r.message);
              });
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-steppe-deep">
              {data.displayName}
            </p>
            <p className="truncate text-xs text-steppe-deep/45">{data.email}</p>
            <p className="mt-1.5 text-xs font-semibold text-steppe-mid">
              {data.progress.levelTitle} · {t.profile.level(data.progress.levelNumber)}
            </p>
            <p className="text-xs text-steppe-deep/45">
              {formatXp(data.progress.xp, locale)} XP
              {!data.progress.maxLevel && data.progress.xpToNext > 0
                ? ` · ${t.profile.xpToNext(data.progress.xpToNext)}`
                : ` · ${t.profile.maxLevel}`}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-steppe-deep/8">
            <div
              className="h-full rounded-full bg-steppe-mid transition-[width] duration-500"
              style={{ width: `${data.progress.progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-steppe-deep/6">
        <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
          {t.profile.badges}
        </h2>
        {earnedBadges.length === 0 ? (
          <p className="mt-2 text-sm text-steppe-deep/45">{t.profile.noBadges}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {data.badges.map((badge) => (
              <li
                key={badge.id}
                className={`flex flex-col items-center rounded-xl px-2 py-3 text-center ${
                  badge.earned
                    ? "bg-steppe-light/15 ring-1 ring-steppe-mid/20"
                    : "bg-sand/80 opacity-40 grayscale"
                }`}
                title={badge.description}
              >
                <span className="flex h-8 w-8 items-center justify-center text-steppe-mid" aria-hidden>
                  <BadgeIcon badgeId={badge.id} earned={badge.earned} />
                </span>
                <span className="mt-1.5 text-[10px] font-semibold leading-tight text-steppe-deep">
                  {t.badges[badge.id] ?? badge.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stats */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-steppe-deep/6">
        <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
          {t.profile.stats}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <StatItem label={t.profile.dumps} value={data.stats.dumpsSubmitted} />
          <StatItem label={t.profile.cleanups} value={data.stats.cleanupsParticipation} />
          <StatItem label={t.profile.verifications} value={data.stats.verifications} />
        </dl>
      </section>

      {/* Offline queue */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-steppe-deep/6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
            {t.profile.offlineQueue}
          </h2>
          <span className="rounded-full bg-steppe-deep/8 px-2.5 py-0.5 text-xs font-bold text-steppe-deep">
            {offlineCount}
          </span>
        </div>
        <p className="mt-1 text-xs text-steppe-deep/45">
          {t.profile.offlineQueueHint}
        </p>
        <button
          type="button"
          onClick={() => void handleSyncOffline()}
          disabled={syncingOffline || offlineCount === 0}
          className={`${btnPrimary} mt-3`}
        >
          {syncingOffline ? t.profile.syncing : t.profile.syncBtn}
        </button>
        {offlineMessage ? (
          <p className="mt-2 text-center text-xs text-steppe-mid">{offlineMessage}</p>
        ) : null}
      </section>

      {/* Actions */}
      <section className="space-y-2">
        {volunteerLabel ? (
          <p className="rounded-xl bg-steppe-light/15 px-4 py-2.5 text-center text-xs font-semibold text-steppe-deep">
            {volunteerLabel}
          </p>
        ) : (
          <button
            type="button"
            disabled={syncing}
            onClick={() => {
              void applyVolunteer().then((r) => {
                if (r.ok) setToast(r.message ?? t.profile.volunteerPending);
                else setToast(r.message);
              });
            }}
            className={btnOutline}
          >
            {t.profile.becomeVolunteer}
          </button>
        )}

        <Link href="/teams" className={btnOutline}>
          {t.profile.myTeams}
          {data.teams.length > 0 ? ` (${data.teams.length})` : ""}
        </Link>

        <button
          type="button"
          onClick={() => void handleShareReferral(data.referralUrl)}
          className={btnOutline}
        >
          {t.profile.inviteFriend}
        </button>
      </section>

      {/* Settings */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-steppe-deep/6">
        <h2 className="text-xs font-semibold tracking-wider text-steppe-deep/40 uppercase">
          {t.profile.settings}
        </h2>

        {/* Language switcher */}
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-steppe-deep/55">
            {t.profile.language}
          </p>
          <div className="flex gap-2">
            {LOCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={syncing}
                onClick={() => void handleLocaleChange(opt.value)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  locale === opt.value
                    ? "bg-steppe-deep text-white shadow-sm"
                    : "bg-sand text-steppe-deep/60 hover:text-steppe-deep"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-steppe-deep">{t.profile.notifications}</span>
          <input
            type="checkbox"
            checked={data.notificationsEnabled}
            disabled={syncing}
            onChange={(e) => {
              const notificationsEnabled = e.target.checked;
              void patchSettings({ notificationsEnabled }).then((r) => {
                if (r.ok) {
                  localStorage.setItem(
                    "ecosteppe-notifications",
                    String(notificationsEnabled),
                  );
                }
              });
            }}
            className="h-5 w-5 rounded border-steppe-mid/40 text-steppe-deep accent-steppe-deep"
          />
        </label>

        <button
          type="button"
          onClick={() => void signOut()}
          className={`${btnOutline} mt-4 border-red-100 text-red-600`}
        >
          {t.profile.signOut}
        </button>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-sand/80 px-2 py-2.5">
      <dt className="text-[10px] font-medium text-steppe-deep/40">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold text-steppe-deep">{value}</dd>
    </div>
  );
}

function BadgeIcon({ badgeId, earned }: { badgeId: string; earned: boolean }) {
  const cls = `h-full w-full ${earned ? "text-steppe-mid" : "text-steppe-deep/30"}`;
  switch (badgeId) {
    case "first_dump":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinejoin="round" />
        </svg>
      );
    case "keeper":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" strokeLinejoin="round" />
        </svg>
      );
    case "team_player":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "cleanup":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinejoin="round" />
        </svg>
      );
    case "xp_500":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinejoin="round" />
        </svg>
      );
    case "legend_path":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M8 3l4 8 5-5-1 12H8L7 6l5 5 4-8" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}

const btnPrimary =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-steppe-deep px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60";
const btnOutline =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-steppe-deep/12 bg-white px-4 text-sm font-medium text-steppe-deep transition active:scale-[0.98] disabled:opacity-60";
