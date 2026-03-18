type ProjectedStudyHealthInput = {
  level: number;
  settledCurrentHp: number;
  settledMaxHp: number;
  todayFocusedMinutes: number;
  dailyGoalMinutes: number;
  hpDeltaCarry?: number;
};

type ProjectedStudyHealth = {
  currentHp: number;
  maxHp: number;
  dailyDelta: number;
  appliedDelta: number;
  nextCarry: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getMaxHpByLevel = (level: number) => 100 + Math.max(0, level - 1) * 12;

const calculateDailyHpDelta = (level: number, focusedMinutes: number, goalMinutes: number) => {
  const safeLevel = Math.max(1, Math.round(level));
  const safeFocused = Math.max(0, Math.round(focusedMinutes));
  const safeGoal = Math.max(1, Math.round(goalMinutes));
  const progressRaw = safeFocused / safeGoal;
  const progress = clamp(progressRaw, 0, 1);
  const dailyLoss = 8 + Math.max(0, safeLevel - 1) * 2;
  const dailyRecovery = 5 + Math.max(0, Math.floor((safeLevel - 1) / 2));

  if (safeFocused === 0) {
    return -dailyLoss;
  }

  if (progress < 1) {
    return -(dailyLoss * (1 - progress));
  }

  if (progressRaw >= 1) {
    return dailyRecovery * progressRaw;
  }

  return dailyRecovery;
};

export const projectStudyHealthForToday = (input: ProjectedStudyHealthInput): ProjectedStudyHealth => {
  const safeLevel = Math.max(1, Math.round(input.level));
  const defaultMaxHp = getMaxHpByLevel(safeLevel);
  const maxHp = Math.max(1, Math.round(input.settledMaxHp || defaultMaxHp));
  const settledCurrentHp = clamp(Math.round(input.settledCurrentHp), 0, maxHp);
  const dailyDelta = calculateDailyHpDelta(safeLevel, input.todayFocusedMinutes, input.dailyGoalMinutes);
  const carry = Number.isFinite(input.hpDeltaCarry) ? Number(input.hpDeltaCarry) : 0;
  const deltaWithCarry = dailyDelta + carry;
  const appliedDelta = deltaWithCarry >= 0 ? Math.floor(deltaWithCarry) : Math.ceil(deltaWithCarry);
  const nextCarry = deltaWithCarry - appliedDelta;
  const currentHp = clamp(settledCurrentHp + appliedDelta, 0, maxHp);

  return {
    currentHp,
    maxHp,
    dailyDelta,
    appliedDelta,
    nextCarry,
  };
};
