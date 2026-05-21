export type TrashVerificationResult = {
  isTrash: boolean;
  /** Пластик, пакеты, бутылки и т.д. — то, что можно убрать */
  isHumanMadeWaste: boolean;
  /** Камень, галька, естественный грунт без бытового мусора */
  isNaturalObject: boolean;
  confidence: number;
  reason?: string;
};

export type VerifyTrashOutcome =
  | { ok: true; result: TrashVerificationResult }
  | { ok: false; error: string };

export type CleanupVerificationResult = {
  isRealOutdoor: boolean;
  isClean: boolean;
  confidence: number;
  reason?: string;
};

export type CleanupPairVerificationResult = CleanupVerificationResult & {
  sameLocation: boolean;
  locationSimilarity: number;
  improvementDetected: boolean;
  /** На фото «до» не было убираемого мусора (камень, природа) */
  onlyNaturalObject: boolean;
};

export type VerifyCleanupOutcome =
  | { ok: true; result: CleanupVerificationResult }
  | { ok: false; error: string };

export type VerifyCleanupPairOutcome =
  | { ok: true; result: CleanupPairVerificationResult }
  | { ok: false; error: string };
