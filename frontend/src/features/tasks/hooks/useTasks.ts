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

const DEFAULT_USER_ID = 1;

export const useTasks = () => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loading, setLoading] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tasks = await getTasksApi(DEFAULT_USER_ID);
      setAllTasks(tasks);
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not fetch tasks from backend'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

  const createTask = useCallback(async (draft: TaskDraft) => {
    setMutationLoading(true);
    setError(null);

    try {
      const createdTask = await createTaskApi(DEFAULT_USER_ID, draft);
      setAllTasks((currentTasks) => [createdTask, ...currentTasks]);
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not create task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, draft: TaskDraft) => {
    setMutationLoading(true);
    setError(null);

    try {
      const updatedTask = await updateTaskApi(DEFAULT_USER_ID, taskId, draft);
      setAllTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? updatedTask : task)));
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not update task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, []);

  const toggleTaskCompletion = useCallback(
    async (taskId: string) => {
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
        const completedTask = await completeTaskApi(DEFAULT_USER_ID, taskId);
        setAllTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? completedTask : task)));
        return true;
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Could not complete task'));
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [allTasks],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    setMutationLoading(true);
    setError(null);

    try {
      await deleteTaskApi(DEFAULT_USER_ID, taskId);
      setAllTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      return true;
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not delete task'));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, []);

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
