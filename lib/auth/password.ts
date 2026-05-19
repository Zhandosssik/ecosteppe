export type PasswordValidation = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Минимум 8 символов");
  }
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) {
    errors.push("Хотя бы одна буква");
  }
  if (!/\d/.test(password)) {
    errors.push("Хотя бы одна цифра");
  }

  return { valid: errors.length === 0, errors };
}

export function passwordsMatch(
  password: string,
  confirm: string,
): string | null {
  if (password !== confirm) {
    return "Пароли не совпадают";
  }
  return null;
}
