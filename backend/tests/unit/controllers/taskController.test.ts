import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import { TaskServiceError } from '../../../src/services/taskService.js';
import {
  completeTask,
  createTask,
  deleteTask,
  getTasksByUser,
  resetTasksDev,
  updateTask,
} from '../../../src/controllers/taskController.js';
import * as taskService from '../../../src/services/taskService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-TCTRL-001 getTasksByUser', () => {
  it('returns 403 when authenticated user and route userId mismatch', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await getTasksByUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TCTRL-002 getTasksByUser', () => {
  it('returns 400 when userId cannot be resolved', async () => {
    const req = {
      user: undefined,
      params: { userId: 'abc' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await getTasksByUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId',
    });
  });
});

describe('TC-TCTRL-003 getTasksByUser', () => {
  it('returns task list payload for resolved user id', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const getTasksMock = jest.spyOn(taskService, 'getTasksByUserId') as unknown as jest.Mock;
    getTasksMock.mockResolvedValue([
      {
        id: 1,
        userId: 7,
        title: 'Read notes',
        description: '',
        difficulty: 'easy',
        status: 'pending',
        xpReward: 10,
        createdAt: '2026-03-01T09:00:00.000Z',
        completedAt: null,
      },
    ]);

    await getTasksByUser(req, res);

    expect(getTasksMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          id: 1,
          userId: 7,
          title: 'Read notes',
          description: '',
          difficulty: 'easy',
          status: 'pending',
          xpReward: 10,
          createdAt: '2026-03-01T09:00:00.000Z',
          completedAt: null,
        },
      ],
    });
  });
});

describe('TC-TCTRL-004 createTask', () => {
  it('returns 403 when authenticated user and route userId mismatch', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8' },
      body: { title: 'New task', difficulty: 'easy' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TCTRL-005 createTask', () => {
  it('returns 201 with created task payload when service succeeds', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
      body: { title: 'Deep work', difficulty: 'hard' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const createTaskMock = jest.spyOn(taskService, 'createTaskForUser') as unknown as jest.Mock;
    createTaskMock.mockResolvedValue({
      id: 2,
      userId: 7,
      title: 'Deep work',
      description: '',
      difficulty: 'hard',
      status: 'pending',
      xpReward: 35,
      createdAt: '2026-03-01T10:00:00.000Z',
      completedAt: null,
    });

    await createTask(req, res);

    expect(createTaskMock).toHaveBeenCalledWith(7, { title: 'Deep work', difficulty: 'hard' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Task created',
      data: {
        id: 2,
        userId: 7,
        title: 'Deep work',
        description: '',
        difficulty: 'hard',
        status: 'pending',
        xpReward: 35,
        createdAt: '2026-03-01T10:00:00.000Z',
        completedAt: null,
      },
    });
  });
});

describe('TC-TCTRL-006 createTask', () => {
  it('maps TaskServiceError through controller error handler', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
      body: { title: '   ' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const createTaskMock = jest.spyOn(taskService, 'createTaskForUser') as unknown as jest.Mock;
    createTaskMock.mockRejectedValue(new TaskServiceError('TASK_TITLE_REQUIRED', 'Task title is required'));

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Task title is required',
    });
  });
});

describe('TC-TCTRL-007 getTasksByUser', () => {
  it('returns 500 when task service throws unexpected error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const getTasksMock = jest.spyOn(taskService, 'getTasksByUserId') as unknown as jest.Mock;
    getTasksMock.mockRejectedValue(new Error('Database unavailable'));

    await getTasksByUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database unavailable',
    });
  });
});

describe('TC-TCTRL-008 createTask', () => {
  it('returns 400 when userId cannot be resolved', async () => {
    const req = {
      user: undefined,
      params: { userId: 'abc' },
      body: { title: 'New task' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId',
    });
  });
});

describe('TC-TCTRL-009 updateTask', () => {
  it('returns updated task payload when service succeeds', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '5' },
      body: { title: 'Updated title' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const updateTaskMock = jest.spyOn(taskService, 'updateTaskForUser') as unknown as jest.Mock;
    updateTaskMock.mockResolvedValue({
      id: 5,
      userId: 7,
      title: 'Updated title',
      description: '',
      difficulty: 'medium',
      status: 'pending',
      xpReward: 20,
      createdAt: '2026-03-05T09:00:00.000Z',
      completedAt: null,
    });

    await updateTask(req, res);

    expect(updateTaskMock).toHaveBeenCalledWith(7, 5, { title: 'Updated title' });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Task updated',
      data: {
        id: 5,
        userId: 7,
        title: 'Updated title',
        description: '',
        difficulty: 'medium',
        status: 'pending',
        xpReward: 20,
        createdAt: '2026-03-05T09:00:00.000Z',
        completedAt: null,
      },
    });
  });
});

describe('TC-TCTRL-010 completeTask', () => {
  it('returns completed task payload with meta when service succeeds', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '9' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const completeTaskMock = jest.spyOn(taskService, 'completeTaskForUser') as unknown as jest.Mock;
    completeTaskMock.mockResolvedValue({
      task: {
        id: 9,
        userId: 7,
        title: 'Complete chapter',
        description: '',
        difficulty: 'hard',
        status: 'completed',
        xpReward: 35,
        createdAt: '2026-03-05T09:30:00.000Z',
        completedAt: '2026-03-05T10:00:00.000Z',
      },
      meta: {
        xpAwarded: 35,
        slimeLevel: 4,
        totalExperience: 220,
      },
    });

    await completeTask(req, res);

    expect(completeTaskMock).toHaveBeenCalledWith(7, 9);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Task completed',
      data: {
        id: 9,
        userId: 7,
        title: 'Complete chapter',
        description: '',
        difficulty: 'hard',
        status: 'completed',
        xpReward: 35,
        createdAt: '2026-03-05T09:30:00.000Z',
        completedAt: '2026-03-05T10:00:00.000Z',
      },
      meta: {
        xpAwarded: 35,
        slimeLevel: 4,
        totalExperience: 220,
      },
    });
  });
});

describe('TC-TCTRL-011 deleteTask', () => {
  it('returns success message when delete service succeeds', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '10' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const deleteTaskMock = jest.spyOn(taskService, 'deleteTaskForUser') as unknown as jest.Mock;
    deleteTaskMock.mockResolvedValue(undefined);

    await deleteTask(req, res);

    expect(deleteTaskMock).toHaveBeenCalledWith(7, 10);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Task deleted',
    });
  });
});

describe('TC-TCTRL-012 resetTasksDev', () => {
  it('returns 401 and exits early when authenticated user id is missing', async () => {
    const req = {
      user: undefined,
      params: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetTasksMock = jest.spyOn(taskService, 'resetTasksForUser') as unknown as jest.Mock;

    await resetTasksDev(req, res);

    expect(resetTasksMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-TCTRL-013 updateTask', () => {
  it('returns 403 when authenticated user and route userId mismatch', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8', taskId: '5' },
      body: { title: 'Updated title' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TCTRL-014 updateTask', () => {
  it('returns 400 when taskId is invalid for an authenticated request', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: 'abc' },
      body: { title: 'Updated title' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId or taskId',
    });
  });
});

describe('TC-TCTRL-015 updateTask', () => {
  it('returns 500 when update service throws unexpected error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '5' },
      body: { title: 'Updated title' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const updateTaskMock = jest.spyOn(taskService, 'updateTaskForUser') as unknown as jest.Mock;
    updateTaskMock.mockRejectedValue(new Error('Update failed'));

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Update failed',
    });
  });
});

describe('TC-TCTRL-016 completeTask', () => {
  it('returns 403 when authenticated user and route userId mismatch', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8', taskId: '9' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await completeTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TCTRL-017 completeTask', () => {
  it('returns 400 when taskId is invalid for an authenticated request', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: 'abc' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await completeTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId or taskId',
    });
  });
});

describe('TC-TCTRL-018 completeTask', () => {
  it('returns 500 when complete service throws unexpected error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '9' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const completeTaskMock = jest.spyOn(taskService, 'completeTaskForUser') as unknown as jest.Mock;
    completeTaskMock.mockRejectedValue(new Error('Complete failed'));

    await completeTask(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Complete failed',
    });
  });
});

describe('TC-TCTRL-019 deleteTask', () => {
  it('returns 403 when authenticated user and route userId mismatch', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8', taskId: '10' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-TCTRL-020 deleteTask', () => {
  it('returns 400 when taskId is invalid for an authenticated request', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: 'abc' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId or taskId',
    });
  });
});

describe('TC-TCTRL-021 deleteTask', () => {
  it('returns 500 when delete service throws unexpected error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { taskId: '10' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const deleteTaskMock = jest.spyOn(taskService, 'deleteTaskForUser') as unknown as jest.Mock;
    deleteTaskMock.mockRejectedValue(new Error('Delete failed'));

    await deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Delete failed',
    });
  });
});

describe('TC-TCTRL-022 resetTasksDev', () => {
  it('returns reset payload when authenticated user reset succeeds', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetTasksMock = jest.spyOn(taskService, 'resetTasksForUser') as unknown as jest.Mock;
    resetTasksMock.mockResolvedValue({ deletedCount: 4 });

    await resetTasksDev(req, res);

    expect(resetTasksMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Tasks reset',
      data: { deletedCount: 4 },
    });
  });
});

describe('TC-TCTRL-023 resetTasksDev', () => {
  it('returns 500 when reset service throws unexpected error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetTasksMock = jest.spyOn(taskService, 'resetTasksForUser') as unknown as jest.Mock;
    resetTasksMock.mockRejectedValue(new Error('Reset failed'));

    await resetTasksDev(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Reset failed',
    });
  });
});
