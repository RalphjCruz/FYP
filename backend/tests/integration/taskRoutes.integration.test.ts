import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authAccountService from '../../src/services/authAccountService.js';
import { TaskServiceError } from '../../src/services/taskService.js';
import * as taskService from '../../src/services/taskService.js';

const app = createApp({
  nodeEnv: 'test',
  corsOrigins: [],
});

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

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  (jest.spyOn(authAccountService, 'isUserActiveById') as unknown as jest.Mock).mockResolvedValue(true);
});

describe('TC-TASKINT-001 GET /api/tasks', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-TASKINT-002 GET /api/tasks', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app).get('/api/tasks').set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-TASKINT-003 GET /api/tasks', () => {
  it('returns task list for authenticated user and forwards user id to service', async () => {
    const getTasksMock = jest.spyOn(taskService, 'getTasksByUserId') as unknown as jest.Mock;
    getTasksMock.mockResolvedValue([
      {
        id: 11,
        userId: 7,
        title: 'Write dissertation section',
        description: 'Draft methods chapter',
        difficulty: 'hard',
        status: 'pending',
        xpReward: 35,
        createdAt: '2026-04-01T10:00:00.000Z',
        completedAt: null,
      },
    ]);

    const token = createAuthToken(7);
    const response = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(getTasksMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          id: 11,
          userId: 7,
          title: 'Write dissertation section',
          description: 'Draft methods chapter',
          difficulty: 'hard',
          status: 'pending',
          xpReward: 35,
          createdAt: '2026-04-01T10:00:00.000Z',
          completedAt: null,
        },
      ],
    });
  });
});

describe('TC-TASKINT-004 POST /api/tasks', () => {
  it('creates task for authenticated user', async () => {
    const createTaskMock = jest.spyOn(taskService, 'createTaskForUser') as unknown as jest.Mock;
    createTaskMock.mockResolvedValue({
      id: 12,
      userId: 7,
      title: 'Prepare slides',
      description: 'Presentation dry run',
      difficulty: 'medium',
      status: 'pending',
      xpReward: 20,
      createdAt: '2026-04-01T11:00:00.000Z',
      completedAt: null,
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Prepare slides', difficulty: 'medium', description: 'Presentation dry run' });

    expect(response.status).toBe(201);
    expect(createTaskMock).toHaveBeenCalledWith(7, {
      title: 'Prepare slides',
      difficulty: 'medium',
      description: 'Presentation dry run',
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Task created',
      data: {
        id: 12,
        userId: 7,
        title: 'Prepare slides',
        description: 'Presentation dry run',
        difficulty: 'medium',
        status: 'pending',
        xpReward: 20,
        createdAt: '2026-04-01T11:00:00.000Z',
        completedAt: null,
      },
    });
  });
});

describe('TC-TASKINT-005 GET /api/tasks/:userId', () => {
  it('returns 403 when route user id does not match authenticated user id', async () => {
    const token = createAuthToken(7);
    const response = await request(app).get('/api/tasks/8').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TASKINT-006 POST /api/tasks/:taskId/complete', () => {
  it('returns 400 when taskId is invalid', async () => {
    const token = createAuthToken(7);
    const response = await request(app).post('/api/tasks/not-a-number/complete').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid userId or taskId',
    });
  });
});

describe('TC-TASKINT-007 PATCH /api/tasks/:taskId', () => {
  it('maps TaskServiceError TASK_NOT_FOUND to 404 response', async () => {
    const updateTaskMock = jest.spyOn(taskService, 'updateTaskForUser') as unknown as jest.Mock;
    updateTaskMock.mockRejectedValue(new TaskServiceError('TASK_NOT_FOUND', 'Task not found'));

    const token = createAuthToken(7);
    const response = await request(app)
      .patch('/api/tasks/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated title' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Task not found',
    });
  });
});

describe('TC-TASKINT-008 DELETE /api/tasks/:taskId', () => {
  it('maps non-Error service failure to fallback 500 message', async () => {
    const deleteTaskMock = jest.spyOn(taskService, 'deleteTaskForUser') as unknown as jest.Mock;
    deleteTaskMock.mockRejectedValue('task-delete-non-error');

    const token = createAuthToken(7);
    const response = await request(app).delete('/api/tasks/12').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to delete task',
    });
  });
});

describe('TC-TASKINT-009 POST /api/tasks/dev-reset', () => {
  it('returns reset payload for authenticated user', async () => {
    const resetTasksMock = jest.spyOn(taskService, 'resetTasksForUser') as unknown as jest.Mock;
    resetTasksMock.mockResolvedValue({ deletedCount: 3 });

    const token = createAuthToken(7);
    const response = await request(app).post('/api/tasks/dev-reset').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(200);
    expect(resetTasksMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      message: 'Tasks reset',
      data: { deletedCount: 3 },
    });
  });
});

describe('TC-TASKINT-010 GET /api/tasks', () => {
  it('returns 401 when authenticated account is inactive', async () => {
    const activeSpy = jest.spyOn(authAccountService, 'isUserActiveById') as unknown as jest.Mock;
    activeSpy.mockResolvedValue(false);

    const token = createAuthToken(7);
    const response = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

