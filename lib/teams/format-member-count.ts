/** Краткая подпись числа участников для карточек команд. */
export function formatMemberCountShort(count: number): string {
  const n = Math.max(0, count);
  if (n === 1) return "1 участник";
  if (n >= 2 && n <= 4) return `${n} участника`;
  return `${n} участников`;
}
