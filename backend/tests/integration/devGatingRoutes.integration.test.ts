import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const PROD_TEST_JWT_KEY = 'prod_test_jwt_key_very_long_and_strong_1234567890';

let app: Express;
let authAccountServiceModule: typeof import('../../src/services/authAccountService.js');
let previousNodeEnv: string | undefined;
let previousCorsOrigin: string | undefined;
let previousJwtSecret: string | undefined;
let previousJwtExpiresIn: string | undefined;

const createAuthToken = (userId: number, email = 'int@example.com', username = 'integration-user') =>
  jwt.sign(
    {
      sub: String(userId),
      email,
      username,
    },
    PROD_TEST_JWT_KEY,
    { expiresIn: '1h' },
  );

beforeAll(async () => {
  previousNodeEnv = process.env.NODE_ENV;
  previousCorsOrigin = process.env.CORS_ORIGIN;
  previousJwtSecret = process.env.JWT_SECRET;
  previousJwtExpiresIn = process.env.JWT_EXPIRES_IN;

  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = PROD_TEST_JWT_KEY;
  process.env.JWT_EXPIRES_IN = '30m';

  jest.resetModules();
  const { createApp } = await import('../../src/app.js');
  authAccountServiceModule = await import('../../src/services/authAccountService.js');

  app = createApp({
    nodeEnv: 'production',
    corsOrigins: ['http://localhost:5173'],
  });
});

beforeEach(() => {
  (jest.spyOn(authAccountServiceModule, 'isUserActiveById') as unknown as jest.Mock).mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env.NODE_ENV = previousNodeEnv;
  process.env.CORS_ORIGIN = previousCorsOrigin;
  process.env.JWT_SECRET = previousJwtSecret;
  process.env.JWT_EXPIRES_IN = previousJwtExpiresIn;
  jest.resetModules();
});

describe('TC-SDGINT-006 POST /api/tasks/dev-reset', () => {
  it('returns 404 in production mode even when bearer token is valid', async () => {
    const token = createAuthToken(7);
    const response = await request(app).post('/api/tasks/dev-reset').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-007 POST /api/focus/dev/settle', () => {
  it('returns 404 in production mode even when bearer token is valid', async () => {
    const token = createAuthToken(7);
    const response = await request(app).post('/api/focus/dev/settle').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-008 POST /api/focus/dev/reset-progress', () => {
  it('returns 404 in production mode even when bearer token is valid', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/dev/reset-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-009 POST /api/customization/wallet/dev-add', () => {
  it('returns 404 in production mode because customization dev-add route is not registered', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/customization/wallet/dev-add')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 25 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Route not found',
    });
  });
});

describe('TC-SDGINT-010 POST /api/customization/wallet/dev-reset', () => {
  it('returns 404 in production mode because customization dev-reset route is not registered', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/customization/wallet/dev-reset')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Route not found',
    });
  });
});

describe('TC-SDGINT-011 POST /api/customization/dev-reset-progress', () => {
  it('returns 404 in production mode because customization dev-reset-progress route is not registered', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/customization/dev-reset-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Route not found',
    });
  });
});
