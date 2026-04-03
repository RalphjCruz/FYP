import { useCallback, useEffect, useState } from 'react';
import { getTasks } from '../api';

type DashboardTaskStats = {
  completedTasks: number;
  completedToday: number;
  dailyGoal: number;
};

type UseDashboardTaskStatsOptions = {
  token: string | null;
  dailyGoal: number;
  enabled?: boolean;
};

const isSameLocalDay = (leftDate: Date, rightDate: Date) =>
  leftDate.getFullYear() === rightDate.getFullYear()
  && leftDate.getMonth() === rightDate.getMonth()
  && leftDate.getDate() === rightDate.getDate();

const createEmptyStats = (dailyGoal: number): DashboardTaskStats => ({
  completedTasks: 0,
  completedToday: 0,
  dailyGoal,
});

export const useDashboardTaskStats = ({ token, dailyGoal, enabled = true }: UseDashboardTaskStatsOptions) => {
  const [stats, setStats] = useState<DashboardTaskStats>(() => createEmptyStats(dailyGoal));

  const refreshStats = useCallback(async () => {
    if (!token) {
      setStats(createEmptyStats(dailyGoal));
      return;
    }

    const now = new Date();

    try {
      const tasks = await getTasks(token);
      const completedTasks = tasks.filter((task) => task.status === 'completed');
      const completedToday = completedTasks.filter((task) => {
        if (!task.completedAt) {
          return false;
        }

        return isSameLocalDay(new Date(task.completedAt), now);
      }).length;

      setStats({
        completedTasks: completedTasks.length,
        completedToday,
        dailyGoal,
      });
    } catch {
      setStats(createEmptyStats(dailyGoal));
    }
  }, [dailyGoal, token]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshStats();
  }, [enabled, refreshStats]);

  return {
    stats,
    refreshStats,
  };
};
