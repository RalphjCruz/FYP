import { clampNumber, parseInteger, parsePositiveInteger } from '../../utils/inputSanitizer.js';

export const parseUserId = (value: string | string[] | undefined): number | null => {
  if (!value) {
    return null;
  }

  const rawValue = Array.isArray(value) ? value[0] : value;
  return parsePositiveInteger(rawValue);
};

export const parseSimulatedDayOffset = (value: unknown): number => {
  const parsedSimulatedOffset = parseInteger(value, 0);
  return Number.isInteger(parsedSimulatedOffset) ? clampNumber(parsedSimulatedOffset, -365, 365) : 0;
};

export const resolveSimulatedNowUtc = (dayOffset: number, nodeEnv: string): Date | undefined => {
  if (nodeEnv === 'production' || dayOffset === 0) {
    return undefined;
  }

  return new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
};
