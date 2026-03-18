const SIMULATED_DAY_OFFSET_STORAGE_KEY = 'myslime.dev.simulatedDayOffset';
const MIN_DAY_OFFSET = -365;
const MAX_DAY_OFFSET = 365;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getSimulatedDayOffset = (): number => {
  try {
    const raw = window.localStorage.getItem(SIMULATED_DAY_OFFSET_STORAGE_KEY);
    const parsed = Number.parseInt(String(raw ?? '0'), 10);
    if (!Number.isInteger(parsed)) {
      return 0;
    }
    return clamp(parsed, MIN_DAY_OFFSET, MAX_DAY_OFFSET);
  } catch {
    return 0;
  }
};

export const setSimulatedDayOffset = (offset: number) => {
  const safeOffset = clamp(Math.round(offset), MIN_DAY_OFFSET, MAX_DAY_OFFSET);
  window.localStorage.setItem(SIMULATED_DAY_OFFSET_STORAGE_KEY, String(safeOffset));
  return safeOffset;
};

export const getSimulatedNowUtcIso = (baseDate = new Date()): string => {
  const offset = getSimulatedDayOffset();
  const simulated = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
  return simulated.toISOString();
};

export const clearSimulatedDayOffset = () => {
  window.localStorage.removeItem(SIMULATED_DAY_OFFSET_STORAGE_KEY);
};
