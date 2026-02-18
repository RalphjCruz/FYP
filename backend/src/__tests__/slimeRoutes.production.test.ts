import express from 'express';
import request from 'supertest';
import { createSlimeRouter } from '../routes/slimeroutes.js';

describe('slime routes in production', () => {
  it('returns 404 for POST /api/slime/test-user', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/slime', createSlimeRouter({ nodeEnv: 'production' }));

    const response = await request(app).post('/api/slime/test-user').send({});

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
  });
});
