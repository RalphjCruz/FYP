const UNSAFE_CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

type SanitizeTextOptions = {
  trim?: boolean;
  collapseWhitespace?: boolean;
  maxLength?: number;
};

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

export const sanitizeText = (value: unknown, options: SanitizeTextOptions = {}): string => {
  const { trim = true, collapseWhitespace = false, maxLength } = options;

  let next = toStringValue(value).replace(UNSAFE_CONTROL_CHARS_REGEX, '');
  if (trim) {
    next = next.trim();
  }

  if (collapseWhitespace) {
    next = next.replace(/\s+/g, ' ');
  }

  if (typeof maxLength === 'number' && Number.isInteger(maxLength) && maxLength > 0) {
    next = next.slice(0, maxLength);
  }

  return next;
};

export const sanitizeEmail = (value: unknown): string => sanitizeText(value, { trim: true, collapseWhitespace: true }).toLowerCase();

export const sanitizeSlug = (value: unknown): string => {
  const cleaned = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 64 }).toLowerCase();
  return /^[a-z0-9-]+$/.test(cleaned) ? cleaned : '';
};

export const parseInteger = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = parseInteger(value, Number.NaN);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
