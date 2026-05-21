/** Служебные строки «фото после уборки» — не показывать в списках зон */
const CLEANUP_PROOF_RE = /\[cleanup:[0-9a-f-]{36}\]/i;

export function isCleanupProofNotes(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return CLEANUP_PROOF_RE.test(notes);
}

export function isPublicZoneReport(row: {
  notes?: string | null;
}): boolean {
  return !isCleanupProofNotes(row.notes);
}
