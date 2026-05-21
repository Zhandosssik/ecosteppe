export const COMPLETED_RETENTION_DAYS = 15;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function completedRetentionCutoffIso(now = Date.now()): string {
  return new Date(now - COMPLETED_RETENTION_DAYS * MS_PER_DAY).toISOString();
}

export function daysUntilCompletedRemoval(
  cleanedAt: string,
  now = Date.now(),
): number {
  const expiresAt =
    new Date(cleanedAt).getTime() + COMPLETED_RETENTION_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((expiresAt - now) / MS_PER_DAY));
}
