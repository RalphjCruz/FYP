import { useMemo, useState } from 'react';
import type { Task, TaskDifficulty, TaskDraft } from '../types';

const DIFFICULTY_XP_REWARD: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const createTaskId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toTask = (draft: TaskDraft): Task => ({
  id: createTaskId(),
  title: draft.title.trim(),
  description: draft.description.trim(),
  difficulty: draft.difficulty,
  status: 'pending',
  xpReward: DIFFICULTY_XP_REWARD[draft.difficulty],
  createdAt: new Date().toISOString(),
  completedAt: null,
});

const INITIAL_TASKS: Task[] = [
  toTask({
    title: 'Plan tomorrow\'s top 3 priorities',
    description: 'Define your most important outcomes before ending today.',
    difficulty: 'easy',
  }),
  toTask({
    title: 'Complete one deep-work block',
    description: 'Run one uninterrupted focus cycle and summarize output.',
    difficulty: 'medium',
  }),
];

type TaskFilter = 'all' | 'pending' | 'completed';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const createTask = (draft: TaskDraft) => {
    const nextTask = toTask(draft);
    setTasks((currentTasks) => [nextTask, ...currentTasks]);
  };

  const updateTask = (taskId: string, draft: TaskDraft) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          title: draft.title.trim(),
          description: draft.description.trim(),
          difficulty: draft.difficulty,
          xpReward: DIFFICULTY_XP_REWARD[draft.difficulty],
        };
      }),
    );
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const isCompleting = task.status !== 'completed';

        return {
          ...task,
          status: isCompleting ? 'completed' : 'pending',
          completedAt: isCompleting ? new Date().toISOString() : null,
        };
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  };

  const visibleTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const stats = useMemo(() => {
    const completedCount = tasks.filter((task) => task.status === 'completed').length;
    const pendingCount = tasks.length - completedCount;
    const earnedXp = tasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + task.xpReward, 0);

    return {
      totalCount: tasks.length,
      completedCount,
      pendingCount,
      earnedXp,
    };
  }, [tasks]);

  return {
    filter,
    tasks: visibleTasks,
    allTasks: tasks,
    stats,
    setFilter,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
  };
};
