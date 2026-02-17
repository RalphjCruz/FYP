import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { Task, TaskDraft, TaskStatus } from '../types';

type TaskApiModel = {
  id: number;
  userId: number;
  title: string;
  description: string;
  difficulty: string;
  status: string;
  xpReward: number;
  createdAt: string;
  completedAt: string | null;
};

const normalizeTaskStatus = (value: string): TaskStatus => {
  if (value === 'completed') {
    return 'completed';
  }

  return 'pending';
};

const normalizeTaskDifficulty = (value: string): Task['difficulty'] => {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return 'medium';
};

const mapTaskFromApi = (task: TaskApiModel): Task => ({
  id: String(task.id),
  title: task.title,
  description: task.description,
  difficulty: normalizeTaskDifficulty(task.difficulty),
  status: normalizeTaskStatus(task.status),
  xpReward: task.xpReward,
  createdAt: task.createdAt,
  completedAt: task.completedAt,
});

const assertSuccess = <T>(response: Response, payload: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }
};

export const getTasks = async (userId: number): Promise<Task[]> => {
  const response = await fetch(`${env.apiBaseUrl}/api/tasks/${userId}`);
  const payload = (await response.json()) as ApiResponse<TaskApiModel[]>;

  assertSuccess(response, payload, 'Failed to fetch tasks');

  return (payload.data ?? []).map(mapTaskFromApi);
};

export const createTask = async (userId: number, draft: TaskDraft): Promise<Task> => {
  const response = await fetch(`${env.apiBaseUrl}/api/tasks/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  });

  const payload = (await response.json()) as ApiResponse<TaskApiModel>;

  assertSuccess(response, payload, 'Failed to create task');

  if (!payload.data) {
    throw new Error('Task data missing from create response');
  }

  return mapTaskFromApi(payload.data);
};

export const updateTask = async (userId: number, taskId: string, draft: TaskDraft): Promise<Task> => {
  const response = await fetch(`${env.apiBaseUrl}/api/tasks/${userId}/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  });

  const payload = (await response.json()) as ApiResponse<TaskApiModel>;

  assertSuccess(response, payload, 'Failed to update task');

  if (!payload.data) {
    throw new Error('Task data missing from update response');
  }

  return mapTaskFromApi(payload.data);
};

export const completeTask = async (userId: number, taskId: string): Promise<Task> => {
  const response = await fetch(`${env.apiBaseUrl}/api/tasks/${userId}/${taskId}/complete`, {
    method: 'POST',
  });

  const payload = (await response.json()) as ApiResponse<TaskApiModel>;

  assertSuccess(response, payload, 'Failed to complete task');

  if (!payload.data) {
    throw new Error('Task data missing from complete response');
  }

  return mapTaskFromApi(payload.data);
};

export const deleteTask = async (userId: number, taskId: string): Promise<void> => {
  const response = await fetch(`${env.apiBaseUrl}/api/tasks/${userId}/${taskId}`, {
    method: 'DELETE',
  });

  const payload = (await response.json()) as ApiResponse<null>;

  assertSuccess(response, payload, 'Failed to delete task');
};
