import { sanitizeEmail, sanitizeText } from '../../utils/inputSanitizer.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type RegistrationPayloadValidation =
  | {
      username: string;
      email: string;
      password: string;
    }
  | {
      error: string;
    };

export const parseRegistrationEmailForAudit = (body: unknown): string => {
  const payload = body as Record<string, unknown>;
  return sanitizeEmail(payload.email);
};

export const validateRegistrationPayload = (body: unknown): RegistrationPayloadValidation => {
  const payload = body as Record<string, unknown>;
  const username = sanitizeText(payload.username, { trim: true, collapseWhitespace: true, maxLength: 32 });
  const email = sanitizeEmail(payload.email);
  const password = sanitizeText(payload.password, { trim: false, collapseWhitespace: false, maxLength: 256 });

  if (username.length < 3) {
    return { error: 'Username must be at least 3 characters long' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please provide a valid email address' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
  }

  return { username, email, password };
};

export const parseLoginPayload = (body: unknown): { email: string; password: string } => {
  const payload = body as Record<string, unknown>;

  return {
    email: sanitizeEmail(payload.email),
    password: sanitizeText(payload.password, {
      trim: false,
      collapseWhitespace: false,
      maxLength: 256,
    }),
  };
};

export const isValidLoginPayload = (payload: { email: string; password: string }): boolean => {
  return EMAIL_REGEX.test(payload.email) && payload.password.length > 0;
};
