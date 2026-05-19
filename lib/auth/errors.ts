export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Неверный email или пароль";
  }
  if (lower.includes("email not confirmed")) {
    return "Подтвердите email — введите код из письма";
  }
  if (lower.includes("user already registered")) {
    return "Этот email уже зарегистрирован. Войдите или восстановите пароль";
  }
  if (lower.includes("otp") || lower.includes("token")) {
    return "Неверный или просроченный код";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return "Слишком много писем. Подождите 1–2 минуты и нажмите снова";
  }
  if (lower.includes("for security purposes")) {
    return "Подождите около минуты перед повторной отправкой кода";
  }
  if (lower.includes("password")) {
    return "Пароль не подходит под требования";
  }
  if (lower.includes("signup requires a valid password")) {
    return "Укажите пароль по требованиям";
  }

  return message;
}
