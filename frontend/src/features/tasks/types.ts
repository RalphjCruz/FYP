export type TaskStatus = 'pending' | 'completed';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export type Task = {
  id: string;
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  xpReward: number;
  createdAt: string;
  completedAt: string | null;
};

export type TaskDraft = {
  title: string;
  description: string;
  difficulty: TaskDifficulty;
};
