import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";

export type ResendSignupResult =
  | { ok: true; hint: string }
  | { ok: false; error: string };

/**
 * Повторная отправка кода при регистрации.
 * Supabase не всегда шлёт письмо на `resend` — пробуем цепочку способов.
 */
export async function resendSignupVerification(
  supabase: SupabaseClient,
  email: string,
  password?: string,
): Promise<ResendSignupResult> {
  const trimmed = email.trim();
  const redirectTo = getAuthRedirectUrl("/auth/callback");

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: { emailRedirectTo: redirectTo },
  });

  if (!resendError) {
    return {
      ok: true,
      hint: "Код отправлен повторно. Проверьте почту и спам.",
    };
  }

  if (password) {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (!signUpError) {
      if (data.session) {
        return {
          ok: true,
          hint: "Аккаунт уже подтверждён — вы вошли в систему.",
        };
      }
      return {
        ok: true,
        hint: "Код отправлен повторно. Проверьте почту и спам.",
      };
    }
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  if (!otpError) {
    return {
      ok: true,
      hint: "Новый код отправлен. Если регистрировались с паролем — введите последний код из письма.",
    };
  }

  const message =
    resendError.message || otpError.message || "Не удалось отправить код";
  return { ok: false, error: message };
}
