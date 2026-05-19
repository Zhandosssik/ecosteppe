"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const btnPrimary =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-steppe-deep px-4 text-sm font-semibold text-white transition active:scale-[0.98]";
const btnOutline =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-steppe-mid/40 bg-white px-4 text-sm font-medium text-steppe-deep transition active:scale-[0.98]";

export function ProfileContent() {
  const { user, loading, configured, openAuth, signOut } = useAuth();

  if (!configured) {
    return (
      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Supabase не настроен. Добавьте ключи в <code className="text-xs">.env</code>{" "}
        для входа и регистрации.
      </div>
    );
  }

  if (loading) {
    return (
      <p className="mt-6 text-sm text-steppe-deep/60">Загрузка профиля…</p>
    );
  }

  if (!user) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm leading-relaxed text-steppe-deep/60">
          Войдите или зарегистрируйтесь, чтобы привязать заявки к аккаунту батыра
          и получать вознаграждения.
        </p>
        <button type="button" onClick={() => openAuth("login")} className={btnPrimary}>
          Войти
        </button>
        <button
          type="button"
          onClick={() => openAuth("register")}
          className={btnOutline}
        >
          Зарегистрироваться
        </button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Батыр";

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4 rounded-2xl border border-sand-dark/70 bg-white p-4 shadow-sm">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-steppe-light/30 text-lg font-semibold text-steppe-deep">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-steppe-deep">{displayName}</p>
          <p className="truncate text-sm text-steppe-deep/55">{user.email}</p>
          <p className="mt-1 text-xs text-steppe-mid">
            {user.app_metadata?.provider === "google"
              ? "Вход через Google"
              : "Email и пароль"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className={`${btnOutline} mt-6 text-red-700 border-red-200`}
      >
        Выйти
      </button>
    </div>
  );
}
