import bcrypt from 'bcrypt';
import pool from '../../../src/config/database.js';
import {
  AuthAccountServiceError,
  findUserCredentialsByEmail,
  getUserProfileById,
  isPasswordMatch,
  registerUserWithSlime,
} from '../../../src/services/authAccountService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-AAS-001 findUserCredentialsByEmail', () => {
  it('returns mapped auth credentials when user exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          password_hash: 'hashed-password',
          created_at: '2026-01-01T12:00:00.000Z',
        },
      ],
    });

    const result = await findUserCredentialsByEmail('student@example.com');

    expect(result).toEqual({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: '2026-01-01T12:00:00.000Z',
    });
  });
});

describe('TC-AAS-002 findUserCredentialsByEmail', () => {
  it('returns null when no user exists for the given email', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [],
    });

    const result = await findUserCredentialsByEmail('missing@example.com');

    expect(result).toBeNull();
  });
});

describe('TC-AAS-003 isPasswordMatch', () => {
  it('returns true when bcrypt compare reports a match', async () => {
    const compareMock = jest.spyOn(bcrypt, 'compare') as unknown as jest.Mock;
    compareMock.mockResolvedValue(true);

    const result = await isPasswordMatch('plain-password', 'hashed-password');

    expect(result).toBe(true);
    expect(compareMock).toHaveBeenCalledWith('plain-password', 'hashed-password');
  });
});

describe('TC-AAS-004 isPasswordMatch', () => {
  it('returns false when bcrypt compare reports no match', async () => {
    const compareMock = jest.spyOn(bcrypt, 'compare') as unknown as jest.Mock;
    compareMock.mockResolvedValue(false);

    const result = await isPasswordMatch('wrong-password', 'hashed-password');

    expect(result).toBe(false);
    expect(compareMock).toHaveBeenCalledWith('wrong-password', 'hashed-password');
  });
});

describe('TC-AAS-005 getUserProfileById', () => {
  it('returns mapped public user profile when user exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          created_at: '2026-01-01T12:00:00.000Z',
        },
      ],
    });

    const result = await getUserProfileById(7);

    expect(result).toEqual({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      createdAt: '2026-01-01T12:00:00.000Z',
    });
  });
});

describe('TC-AAS-006 getUserProfileById', () => {
  it('returns null when no user profile exists for the given id', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [],
    });

    const result = await getUserProfileById(404);

    expect(result).toBeNull();
  });
});

describe('TC-AAS-007 registerUserWithSlime', () => {
  it('creates user and slime, commits transaction, and returns public user payload', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        return {
          rows: [
            {
              id: 11,
              email: 'student@example.com',
              username: 'student',
              password_hash: 'hashed-password',
              created_at: '2026-01-01T12:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO slimes')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT to_regclass')) {
        return { rows: [{ regclass: null }] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    const result = await registerUserWithSlime({
      username: 'student',
      email: 'student@example.com',
      password: 'securePass123',
      passwordHashRounds: 10,
    });

    expect(hashMock).toHaveBeenCalledWith('securePass123', 10);
    expect(result).toEqual({
      user: {
        id: 11,
        email: 'student@example.com',
        username: 'student',
        createdAt: '2026-01-01T12:00:00.000Z',
      },
    });
    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-AAS-008 registerUserWithSlime', () => {
  it('rolls back and throws EMAIL_IN_USE when duplicate email violation occurs', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        throw {
          code: '23505',
          detail: 'Key (email)=(student@example.com) already exists.',
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await expect(
      registerUserWithSlime({
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
        passwordHashRounds: 10,
      }),
    ).rejects.toMatchObject({
      name: 'AuthAccountServiceError',
      code: 'EMAIL_IN_USE',
      message: 'Email already in use',
    } as Partial<AuthAccountServiceError>);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    const commitCall = queryMock.mock.calls.find((call) => call[0] === 'COMMIT');
    expect(commitCall).toBeUndefined();
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-AAS-009 registerUserWithSlime', () => {
  it('rolls back and throws USERNAME_IN_USE when duplicate username violation occurs', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        throw {
          code: '23505',
          detail: 'Key (username)=(student) already exists.',
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await expect(
      registerUserWithSlime({
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
        passwordHashRounds: 10,
      }),
    ).rejects.toMatchObject({
      name: 'AuthAccountServiceError',
      code: 'USERNAME_IN_USE',
      message: 'Username already in use',
    } as Partial<AuthAccountServiceError>);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    const commitCall = queryMock.mock.calls.find((call) => call[0] === 'COMMIT');
    expect(commitCall).toBeUndefined();
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-AAS-010 registerUserWithSlime', () => {
  it('rolls back and throws USER_EXISTS for duplicate key violations without email/username detail', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        throw {
          code: '23505',
          detail: 'Key already exists.',
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await expect(
      registerUserWithSlime({
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
        passwordHashRounds: 10,
      }),
    ).rejects.toMatchObject({
      name: 'AuthAccountServiceError',
      code: 'USER_EXISTS',
      message: 'User already exists',
    } as Partial<AuthAccountServiceError>);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    const commitCall = queryMock.mock.calls.find((call) => call[0] === 'COMMIT');
    expect(commitCall).toBeUndefined();
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-AAS-011 registerUserWithSlime', () => {
  it('rolls back and rethrows original error for unexpected database failures', async () => {
    const unexpectedError = new Error('database unavailable');

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        throw unexpectedError;
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await expect(
      registerUserWithSlime({
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
        passwordHashRounds: 10,
      }),
    ).rejects.toBe(unexpectedError);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    const commitCall = queryMock.mock.calls.find((call) => call[0] === 'COMMIT');
    expect(commitCall).toBeUndefined();
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-AAS-012 registerUserWithSlime', () => {
  it('resets user-scoped progress and upserts default customization wallet when tables exist', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO users')) {
        return {
          rows: [
            {
              id: 21,
              email: 'student@example.com',
              username: 'student',
              password_hash: 'hashed-password',
              created_at: '2026-01-01T12:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO slimes')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT to_regclass')) {
        return { rows: [{ regclass: 'public.customization_wallets' }] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('DELETE FROM')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = {
      query: queryMock,
      release: releaseMock,
    };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const hashMock = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await registerUserWithSlime({
      username: 'student',
      email: 'student@example.com',
      password: 'securePass123',
      passwordHashRounds: 10,
    });

    const walletUpsertCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO customization_wallets'),
    );
    expect(walletUpsertCall).toBeDefined();
    const walletUpsertParams = (walletUpsertCall as unknown as [string, unknown[]])[1];
    expect(walletUpsertParams).toEqual([21, 250]);
  });
});
