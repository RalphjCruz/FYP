import pool from '../config/database.js';
import { ensureStudyHealthSchema } from './studyHealthService.js';

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  level: number;
  totalExperience: number;
  completedTasks: number;
  unlockedAchievements: number;
  dayStreak: number;
};

export const getGlobalLeaderboard = async (limit = 20): Promise<LeaderboardEntry[]> => {
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;
  await ensureStudyHealthSchema();

  const result = await pool.query(
    `SELECT
      u.id AS user_id,
      u.username,
      s.level,
      s.experience AS total_experience,
      COALESCE(task_stats.completed_tasks, 0)::int AS completed_tasks,
      COALESCE(achievement_stats.unlocked_achievements, 0)::int AS unlocked_achievements,
      CASE
        WHEN study_stats.last_studied_on_local =
             (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(study_stats.timezone_iana, 'UTC'))::date
        THEN COALESCE(study_stats.day_streak, 0)::int
        ELSE 0
      END AS day_streak
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
     LEFT JOIN user_study_stats study_stats ON study_stats.user_id = u.id
      ORDER BY
      s.level DESC,
      s.experience DESC,
      CASE
        WHEN study_stats.last_studied_on_local =
             (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(study_stats.timezone_iana, 'UTC'))::date
        THEN COALESCE(study_stats.day_streak, 0)
        ELSE 0
      END DESC,
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
    dayStreak: Number(row.day_streak ?? 0),
  }));
};
