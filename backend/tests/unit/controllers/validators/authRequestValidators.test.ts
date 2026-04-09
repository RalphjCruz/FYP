import {
  isValidLoginPayload,
  parseLoginPayload,
  parseRegistrationEmailForAudit,
  validateRegistrationPayload,
} from '../../../../src/controllers/validators/authRequestValidators.js';

describe('TC-ARV-001 parseRegistrationEmailForAudit', () => {
  it('normalizes registration email for audit logging', () => {
    const result = parseRegistrationEmailForAudit({
      email: '  Student@Example.COM  ',
    });

    expect(result).toBe('student@example.com');
  });
});

describe('TC-ARV-002 parseRegistrationEmailForAudit', () => {
  it('returns empty string when email is missing or invalid type', () => {
    expect(parseRegistrationEmailForAudit({})).toBe('');
    expect(parseRegistrationEmailForAudit({ email: 12345 })).toBe('');
  });
});

describe('TC-ARV-003 validateRegistrationPayload', () => {
  it('returns username length error when username is shorter than 3 characters', () => {
    const result = validateRegistrationPayload({
      username: 'ab',
      email: 'student@example.com',
      password: 'securePass123',
    });

    expect(result).toEqual({
      error: 'Username must be at least 3 characters long',
    });
  });
});

describe('TC-ARV-004 validateRegistrationPayload', () => {
  it('returns invalid email error when email format is not valid', () => {
    const result = validateRegistrationPayload({
      username: 'validUser',
      email: 'not-an-email',
      password: 'securePass123',
    });

    expect(result).toEqual({
      error: 'Please provide a valid email address',
    });
  });
});

describe('TC-ARV-005 validateRegistrationPayload', () => {
  it('returns password length error when password is shorter than minimum length', () => {
    const result = validateRegistrationPayload({
      username: 'validUser',
      email: 'student@example.com',
      password: 'short',
    });

    expect(result).toEqual({
      error: 'Password must be at least 8 characters long',
    });
  });
});

describe('TC-ARV-006 validateRegistrationPayload', () => {
  it('returns sanitized payload when registration input is valid', () => {
    const result = validateRegistrationPayload({
      username: '  Valid   User  ',
      email: '  Student@Example.COM  ',
      password: '  securePass123  ',
    });

    expect(result).toEqual({
      username: 'Valid User',
      email: 'student@example.com',
      password: '  securePass123  ',
    });
  });
});

describe('TC-ARV-007 parseLoginPayload', () => {
  it('returns sanitized login payload with normalized email and preserved password spacing', () => {
    const result = parseLoginPayload({
      email: '  Student@Example.COM  ',
      password: '  pass with spaces  ',
    });

    expect(result).toEqual({
      email: 'student@example.com',
      password: '  pass with spaces  ',
    });
  });
});

describe('TC-ARV-008 isValidLoginPayload', () => {
  it('returns true when email format is valid and password is non-empty', () => {
    const result = isValidLoginPayload({
      email: 'student@example.com',
      password: 'securePass123',
    });

    expect(result).toBe(true);
  });
});

describe('TC-ARV-009 isValidLoginPayload', () => {
  it('returns false when email format is invalid', () => {
    const result = isValidLoginPayload({
      email: 'not-an-email',
      password: 'securePass123',
    });

    expect(result).toBe(false);
  });
});

describe('TC-ARV-010 isValidLoginPayload', () => {
  it('returns false when password is empty', () => {
    const result = isValidLoginPayload({
      email: 'student@example.com',
      password: '',
    });

    expect(result).toBe(false);
  });
});
