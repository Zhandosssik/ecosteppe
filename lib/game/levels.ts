export type BatyrLevel = {
  key: string;
  title: string;
  minXp: number;
};

const LEVELS: BatyrLevel[] = [
  { key: "witness", title: "Очевидец", minXp: 0 },
  { key: "scout", title: "Следопыт степи", minXp: 100 },
  { key: "keeper", title: "Хранитель степи", minXp: 500 },
  { key: "batyr", title: "Батыр степи", minXp: 1500 },
  { key: "legend", title: "Легенда степи", minXp: 4000 },
];

export function getLevelFromXp(xp: number): BatyrLevel {
  const safe = Math.max(0, Math.floor(xp));
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (safe >= level.minXp) {
      current = level;
    }
  }
  return current;
}

export type LevelProgress = {
  level: BatyrLevel;
  levelNumber: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  progressPct: number;
  maxLevel: boolean;
};

export function getLevelProgress(xp: number): LevelProgress {
  const safe = Math.max(0, Math.floor(xp));
  const level = getLevelFromXp(safe);
  const levelIndex = LEVELS.findIndex((l) => l.key === level.key);
  const levelNumber = levelIndex + 1;
  const next = LEVELS[levelIndex + 1];

  if (!next) {
    const xpIntoLevel = safe - level.minXp;
    return {
      level,
      levelNumber,
      xp: safe,
      xpIntoLevel,
      xpToNext: 0,
      progressPct: 100,
      maxLevel: true,
    };
  }

  const xpIntoLevel = safe - level.minXp;
  const xpToNext = next.minXp - level.minXp;
  const progressPct =
    xpToNext > 0 ? Math.min(100, Math.round((xpIntoLevel / xpToNext) * 100)) : 0;

  return {
    level,
    levelNumber,
    xp: safe,
    xpIntoLevel,
    xpToNext: Math.max(0, next.minXp - safe),
    progressPct,
    maxLevel: false,
  };
}
