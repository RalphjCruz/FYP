import { parseInteger, sanitizeSlug } from '../../utils/inputSanitizer.js';

export const parseCustomizationDevCoinAmount = (value: unknown): number => {
  return parseInteger(value, 0);
};

export const parseCustomizationItemId = (value: unknown): string | null => {
  const parsed = sanitizeSlug(value);
  return parsed || null;
};
