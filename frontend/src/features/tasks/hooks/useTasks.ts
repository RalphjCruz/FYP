import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseApiErrorMessage } from '../../../shared/types/api';
import {
  completeTask as completeTaskApi,
  createTask as createTaskApi,
  deleteTask as deleteTaskApi,
  getTasks as getTasksApi,
  updateTask as updateTaskApi,
} from '../api';
import type { Task, TaskDraft } from '../types';

type TaskFilter = 'all' | 'pending' | 'completed';

export const useTasks = (userId: number | null) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loading, setLoading] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    if (!userId) {
      setAllTasks([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tasks = await getTasksApi(userId);
      setAllTasks(tasks);
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not fetch tasks from backend'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

  const createTask = useCallback(async (draft: TaskDraft) => {
    if (!userId) {
      setError('No active user found. Create/load a user first.');
      return false;
    }

    setMutationLoading(true);
    setError(null);

    try {
      const createdTask = await createTaskApi(userId, draft);
      setAllTasks((currentTasks) => [createdTask, ...currentTasks]);
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not create task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [userId]);

  const updateTask = useCallback(async (taskId: string, draft: TaskDraft) => {
    if (!userId) {
      setError('No active user found. Create/load a user first.');
      return false;
    }

    setMutationLoading(true);
    setError(null);

    try {
      const updatedTask = await updateTaskApi(userId, taskId, draft);
      setAllTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? updatedTask : task)));
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not update task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [userId]);

  const toggleTaskCompletion = useCallback(
    async (taskId: string) => {
      if (!userId) {
        setError('No active user found. Create/load a user first.');
        return false;
      }

      const existingTask = allTasks.find((task) => task.id === taskId);
      if (!existingTask) {
        return false;
      }

      if (existingTask.status === 'completed') {
        return true;
      }

      setMutationLoading(true);
      setError(null);

      try {
        const completedTask = await completeTaskApi(userId, taskId);
        setAllTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? completedTask : task)));
        return true;
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Could not complete task'));
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [allTasks, userId],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      setError('No active user found. Create/load a user first.');
      return false;
    }

    setMutationLoading(true);
    setError(null);

    try {
      await deleteTaskApi(userId, taskId);
      setAllTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not delete task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [userId]);

  const tasks = useMemo(() => {
    if (filter === 'all') {
      return allTasks;
    }

    return allTasks.filter((task) => task.status === filter);
  }, [allTasks, filter]);

  const stats = useMemo(() => {
    const completedCount = allTasks.filter((task) => task.status === 'completed').length;
    const pendingCount = allTasks.length - completedCount;
    const earnedXp = allTasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + task.xpReward, 0);

    return {
      totalCount: allTasks.length,
      completedCount,
      pendingCount,
      earnedXp,
    };
  }, [allTasks]);

  return {
    filter,
    tasks,
    allTasks,
    stats,
    loading,
    mutationLoading,
    error,
    setFilter,
    refreshTasks,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
  };
};
