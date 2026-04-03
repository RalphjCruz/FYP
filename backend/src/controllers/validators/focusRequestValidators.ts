import { sanitizeText } from '../../utils/inputSanitizer.js';

export const parseOptionalUtcDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 80 });
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const parseOptionalTimezone = (value: unknown): string | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 64 });
  return sanitized || undefined;
};

export const parseOptionalStudyStyle = (value: unknown): 'deep_focus' | 'balanced' | 'sprint' | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 32 });
  if (!sanitized) {
    return undefined;
  }

  if (sanitized === 'deep_focus' || sanitized === 'balanced' || sanitized === 'sprint') {
    return sanitized;
  }

  return undefined;
};

export const parseOptionalDistractionLevel = (value: unknown): 'low' | 'medium' | 'high' | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 16 });
  if (!sanitized) {
    return undefined;
  }

  if (sanitized === 'low' || sanitized === 'medium' || sanitized === 'high') {
    return sanitized;
  }

  return undefined;
};
