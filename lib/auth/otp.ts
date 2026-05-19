/** Supabase может присылать 6- или 8-значный код — зависит от настроек проекта. */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 8;

export function isValidOtpCode(code: string): boolean {
  const trimmed = code.trim();
  return /^\d{6,8}$/.test(trimmed);
}

export function otpValidationMessage(): string {
  return `Введите код из письма (${OTP_MIN_LENGTH}–${OTP_MAX_LENGTH} цифр)`;
}
