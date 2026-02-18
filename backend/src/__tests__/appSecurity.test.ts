import request from 'supertest';
import { createApp } from '../app.js';

describe('app security middleware', () => {
  it('allows preflight from configured CORS origin', async () => {
    const app = createApp({
      nodeEnv: 'test',
      corsOrigins: ['http://localhost:5173'],
    });

    const response = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization,Content-Type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('blocks preflight from disallowed CORS origin', async () => {
    const app = createApp({
      nodeEnv: 'test',
      corsOrigins: ['http://localhost:5173'],
    });

    const response = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://evil.example')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization,Content-Type');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('CORS origin is not allowed');
  });
});
