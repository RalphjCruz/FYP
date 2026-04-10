import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createSlimeRouter } from '../../src/routes/slimeroutes.js';
import { env } from '../../src/config/env.js';

const app = express();
app.use(express.json());
app.use('/api/slime', createSlimeRouter({ nodeEnv: 'production' }));

const createAuthToken = (userId: number, email = 'int@example.com', username = 'integration-user') =>
  jwt.sign(
    {
      sub: String(userId),
      email,
      username,
    },
    env.jwtSecret,
    { expiresIn: '1h' },
  );

describe('TC-SDGINT-001 POST /api/slime/test-user', () => {
  it('returns 404 in production mode because dev test-user route is gated', async () => {
    const response = await request(app).post('/api/slime/test-user').send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-002 POST /api/slime/me/dev-xp', () => {
  it('returns 404 in production mode even when bearer token is provided', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/slime/me/dev-xp')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-003 POST /api/slime/me/dev-reset-xp', () => {
  it('returns 404 in production mode for dev reset XP route', async () => {
    const response = await request(app).post('/api/slime/me/dev-reset-xp').send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-004 POST /api/slime/me/dev-reset-achievements', () => {
  it('returns 404 in production mode for dev reset achievements route', async () => {
    const response = await request(app).post('/api/slime/me/dev-reset-achievements').send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});

describe('TC-SDGINT-005 GET /api/slime/me', () => {
  it('returns 401 without token, confirming non-dev route still enforces auth', async () => {
    const response = await request(app).get('/api/slime/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});
