"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import {
  passwordsMatch,
  validatePassword,
} from "@/lib/auth/password";
import {
  isValidOtpCode,
  OTP_MAX_LENGTH,
  otpValidationMessage,
} from "@/lib/auth/otp";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { resendSignupVerification } from "@/lib/auth/resend-signup-code";
import { AuthField } from "@/components/auth/AuthField";
import { useAuth, type AuthView } from "@/components/auth/AuthProvider";

const btnPrimary =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-steppe-deep px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50";
const btnSecondary =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sand-dark bg-white px-4 text-sm font-medium text-steppe-deep transition active:scale-[0.98] disabled:opacity-50";

const RESEND_COOLDOWN_SEC = 60;

export function AuthScreen() {
  const {
    authView,
    setAuthView,
    pendingEmail,
    pendingPassword,
    setPendingEmail,
    setPendingPassword,
    refreshSession,
  } = useAuth();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState(pendingEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, [pendingEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((sec) => (sec <= 1 ? 0 : sec - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resetForm = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError(null);
    setInfo(null);
  }, []);

  const switchView = useCallback(
    (view: AuthView) => {
      resetForm();
      setAuthView(view);
    },
    [resetForm, setAuthView],
  );

  const handleGoogle = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });
    if (oauthError) {
      setError(mapAuthError(oauthError.message));
      setBusy(false);
    }
  }, [supabase]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      setBusy(true);
      setError(null);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setPendingEmail(email.trim());
          setPendingPassword(password);
          setInfo("Подтвердите email — введите код из письма");
          switchView("verify");
          setBusy(false);
          return;
        }
        setError(mapAuthError(signInError.message));
        setBusy(false);
        return;
      }

      if (data.session) {
        await refreshSession();
      }
      setBusy(false);
    },
    [supabase, email, password, refreshSession, setPendingEmail, setPendingPassword, switchView],
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;

      const validation = validatePassword(password);
      if (!validation.valid) {
        setError(validation.errors.join(". "));
        return;
      }
      const mismatch = passwordsMatch(password, confirmPassword);
      if (mismatch) {
        setError(mismatch);
        return;
      }

      setBusy(true);
      setError(null);

      const trimmedEmail = email.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
        },
      });

      if (signUpError) {
        const lower = signUpError.message.toLowerCase();
        if (
          lower.includes("already registered") ||
          lower.includes("already been registered")
        ) {
          setPendingEmail(trimmedEmail);
          setPendingPassword(password);
          const resent = await resendSignupVerification(
            supabase,
            trimmedEmail,
            password,
          );
          setBusy(false);
          if (resent.ok) {
            setInfo(resent.hint);
            switchView("verify");
          } else {
            setError(mapAuthError(resent.error));
            setInfo("Email уже зарегистрирован. Войдите или введите код, если он был в письме.");
            switchView("verify");
          }
          return;
        }
        setError(mapAuthError(signUpError.message));
        setBusy(false);
        return;
      }

      if (data.session) {
        await refreshSession();
        setBusy(false);
        return;
      }

      setPendingEmail(trimmedEmail);
      setPendingPassword(password);
      setInfo("На ваш email отправлен код подтверждения");
      switchView("verify");
      setBusy(false);
    },
    [
      supabase,
      email,
      password,
      confirmPassword,
      refreshSession,
      setPendingEmail,
      setPendingPassword,
      switchView,
    ],
  );

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      const targetEmail = (pendingEmail || email).trim();
      if (!targetEmail || !isValidOtpCode(otp)) {
        setError(otpValidationMessage());
        return;
      }

      setBusy(true);
      setError(null);

      let verifyError = (
        await supabase.auth.verifyOtp({
          email: targetEmail,
          token: otp.trim(),
          type: "signup",
        })
      ).error;

      if (verifyError) {
        const retry = await supabase.auth.verifyOtp({
          email: targetEmail,
          token: otp.trim(),
          type: "email",
        });
        verifyError = retry.error;
      }

      if (verifyError) {
        setError(mapAuthError(verifyError.message));
        setBusy(false);
        return;
      }

      await refreshSession();
      setBusy(false);
    },
    [supabase, pendingEmail, email, otp, refreshSession],
  );

  const handleResendCode = useCallback(async () => {
    if (!supabase) return;
    if (resendCooldown > 0) return;

    const targetEmail = (pendingEmail || email).trim();
    if (!targetEmail) {
      setError("Укажите email");
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    const result = await resendSignupVerification(
      supabase,
      targetEmail,
      pendingPassword || password || undefined,
    );

    setBusy(false);

    if (!result.ok) {
      setError(mapAuthError(result.error));
      return;
    }

    setInfo(result.hint);
    setResendCooldown(RESEND_COOLDOWN_SEC);
  }, [
    supabase,
    pendingEmail,
    email,
    pendingPassword,
    password,
    resendCooldown,
    refreshSession,
  ]);

  const handleForgot = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      setBusy(true);
      setError(null);

      const trimmedEmail = email.trim();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: getAuthRedirectUrl("/auth/callback?next=/profile"),
        },
      );

      if (resetError) {
        setError(mapAuthError(resetError.message));
        setBusy(false);
        return;
      }

      setPendingEmail(trimmedEmail);
      setInfo("Код для сброса пароля отправлен на email");
      switchView("reset");
      setBusy(false);
    },
    [supabase, email, setPendingEmail, switchView],
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;

      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        setError(validation.errors.join(". "));
        return;
      }
      const mismatch = passwordsMatch(newPassword, confirmNewPassword);
      if (mismatch) {
        setError(mismatch);
        return;
      }
      if (!isValidOtpCode(otp)) {
        setError(otpValidationMessage());
        return;
      }

      setBusy(true);
      setError(null);

      const targetEmail = (pendingEmail || email).trim();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: otp.trim(),
        type: "recovery",
      });

      if (verifyError) {
        setError(mapAuthError(verifyError.message));
        setBusy(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(mapAuthError(updateError.message));
        setBusy(false);
        return;
      }

      await refreshSession();
      setInfo("Пароль обновлён");
      setBusy(false);
    },
    [
      supabase,
      newPassword,
      confirmNewPassword,
      otp,
      pendingEmail,
      email,
      refreshSession,
    ],
  );

  const titles: Record<AuthView, string> = {
    login: "Вход",
    register: "Регистрация",
    verify: "Подтверждение email",
    forgot: "Восстановление пароля",
    reset: "Новый пароль",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-sand/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div className="flex-1 overflow-y-auto px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-steppe-mid">
            EcoSteppe
          </p>
          <h1
            id="auth-title"
            className="mt-2 text-center text-2xl font-semibold text-steppe-deep"
          >
            {titles[authView]}
          </h1>
          <p className="mt-1 text-center text-sm text-steppe-deep/55">
            {authView === "login" && "Войдите, чтобы сохранять заявки и прогресс батыра"}
            {authView === "register" && "Создайте аккаунт батыра"}
            {authView === "verify" && `Код отправлен на ${pendingEmail || email}`}
            {authView === "forgot" && "Введите email — пришлём код для сброса"}
            {authView === "reset" && "Введите код и новый пароль"}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {info && !error ? (
            <p className="mt-4 rounded-xl bg-sky/60 px-3 py-2.5 text-sm text-steppe-deep">
              {info}
            </p>
          ) : null}

          {(authView === "login" || authView === "register") && (
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={busy}
              className={`${btnSecondary} mt-6`}
            >
              <GoogleIcon />
              Продолжить с Google
            </button>
          )}

          {(authView === "login" || authView === "register") && (
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-sand-dark" />
              <span className="text-xs text-steppe-deep/45">или email</span>
              <span className="h-px flex-1 bg-sand-dark" />
            </div>
          )}

          {authView === "login" && (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
              <AuthField
                id="login-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@example.com"
              />
              <AuthField
                id="login-password"
                label="Пароль"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              <button type="submit" disabled={busy} className={btnPrimary}>
                Войти
              </button>
              <button
                type="button"
                onClick={() => switchView("forgot")}
                className="w-full text-center text-sm text-steppe-mid underline-offset-2 hover:underline"
              >
                Забыли пароль?
              </button>
            </form>
          )}

          {authView === "register" && (
            <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
              <AuthField
                id="reg-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />
              <AuthField
                id="reg-password"
                label="Пароль"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <p className="-mt-2 text-xs text-steppe-deep/50">
                Минимум 8 символов, буква и цифра
              </p>
              <AuthField
                id="reg-confirm"
                label="Подтверждение пароля"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              <button type="submit" disabled={busy} className={btnPrimary}>
                Зарегистрироваться
              </button>
            </form>
          )}

          {authView === "verify" && (
            <form onSubmit={(e) => void handleVerify(e)} className="space-y-4">
              <AuthField
                id="verify-otp"
                label="Код из письма"
                value={otp}
                onChange={setOtp}
                inputMode="numeric"
                maxLength={OTP_MAX_LENGTH}
                placeholder="00000000"
                autoComplete="one-time-code"
              />
              <button type="submit" disabled={busy} className={btnPrimary}>
                Подтвердить
              </button>
              <button
                type="button"
                onClick={() => void handleResendCode()}
                disabled={busy || resendCooldown > 0}
                className="w-full min-h-11 text-center text-sm text-steppe-mid disabled:text-steppe-deep/35"
              >
                {resendCooldown > 0
                  ? `Отправить снова через ${resendCooldown} с`
                  : "Отправить код снова"}
              </button>
              <p className="text-center text-xs text-steppe-deep/45">
                Между письмами Supabase просит подождать ~1 мин. Используйте
                последний пришедший код.
              </p>
            </form>
          )}

          {authView === "forgot" && (
            <form onSubmit={(e) => void handleForgot(e)} className="space-y-4">
              <AuthField
                id="forgot-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />
              <button type="submit" disabled={busy} className={btnPrimary}>
                Отправить код
              </button>
            </form>
          )}

          {authView === "reset" && (
            <form
              onSubmit={(e) => void handleResetPassword(e)}
              className="space-y-4"
            >
              <AuthField
                id="reset-otp"
                label="Код из письма"
                value={otp}
                onChange={setOtp}
                inputMode="numeric"
                maxLength={OTP_MAX_LENGTH}
                placeholder="00000000"
                autoComplete="one-time-code"
              />
              <AuthField
                id="reset-password"
                label="Новый пароль"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <AuthField
                id="reset-confirm"
                label="Подтверждение пароля"
                type="password"
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                autoComplete="new-password"
              />
              <button type="submit" disabled={busy} className={btnPrimary}>
                Сохранить пароль
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-steppe-deep/60">
            {authView === "login" && (
              <>
                Нет аккаунта?{" "}
                <button
                  type="button"
                  onClick={() => switchView("register")}
                  className="font-medium text-steppe-mid underline-offset-2 hover:underline"
                >
                  Зарегистрироваться
                </button>
              </>
            )}
            {authView === "register" && (
              <>
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="font-medium text-steppe-mid underline-offset-2 hover:underline"
                >
                  Войти
                </button>
              </>
            )}
            {(authView === "verify" ||
              authView === "forgot" ||
              authView === "reset") && (
              <button
                type="button"
                onClick={() => switchView("login")}
                className="font-medium text-steppe-mid underline-offset-2 hover:underline"
              >
                ← Назад ко входу
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c3.42-3.15 5.385-7.78 5.385-13.275z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
