import pool from '../config/database.js';

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  level: number;
  totalExperience: number;
  completedTasks: number;
  unlockedAchievements: number;
};

export const getGlobalLeaderboard = async (limit = 20): Promise<LeaderboardEntry[]> => {
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;

  const result = await pool.query(
    `SELECT
      u.id AS user_id,
      u.username,
      s.level,
      s.experience AS total_experience,
      COALESCE(task_stats.completed_tasks, 0)::int AS completed_tasks,
      COALESCE(achievement_stats.unlocked_achievements, 0)::int AS unlocked_achievements
     FROM users u
     JOIN slimes s ON s.user_id = u.id
     LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS completed_tasks
      FROM tasks
      WHERE status = 'completed'
      GROUP BY user_id
     ) task_stats ON task_stats.user_id = u.id
     LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS unlocked_achievements
      FROM user_achievements
      GROUP BY user_id
     ) achievement_stats ON achievement_stats.user_id = u.id
     ORDER BY
      s.level DESC,
      s.experience DESC,
      COALESCE(task_stats.completed_tasks, 0) DESC,
      u.username ASC
     LIMIT $1`,
    [safeLimit],
  );

  return result.rows.map((row, index) => ({
    rank: index + 1,
    userId: Number(row.user_id),
    username: String(row.username),
    level: Number(row.level ?? 1),
    totalExperience: Number(row.total_experience ?? 0),
    completedTasks: Number(row.completed_tasks ?? 0),
    unlockedAchievements: Number(row.unlocked_achievements ?? 0),
  }));
};
