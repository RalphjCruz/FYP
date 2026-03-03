import pool from '../config/database.js';

export type DailyTrendPoint = {
  date: string;
  value: number;
};

export type AnalyticsSummary = {
  tasks: {
    total: number;
    completed: number;
    completionRatePercent: number;
    completedLast7Days: DailyTrendPoint[];
  };
  xp: {
    totalExperience: number;
    level: number;
    gainedLast7Days: DailyTrendPoint[];
  };
  achievements: {
    unlockedCount: number;
  };
};

const ensureXpEventsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS slime_xp_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      xp_amount INTEGER NOT NULL,
      reason VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
};

const getCompletedTasksTrendLast7Days = async (userId: number): Promise<DailyTrendPoint[]> => {
  const result = await pool.query(
    `WITH days AS (
      SELECT generate_series((CURRENT_DATE - INTERVAL '6 days')::date, CURRENT_DATE::date, INTERVAL '1 day')::date AS day
    )
    SELECT
      TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(COUNT(t.id), 0)::int AS value
    FROM days
    LEFT JOIN tasks t
      ON t.user_id = $1
     AND t.status = 'completed'
     AND t.completed_at::date = days.day
    GROUP BY days.day
    ORDER BY days.day`,
    [userId],
  );

  return result.rows.map((row) => ({
    date: String(row.date),
    value: Number(row.value ?? 0),
  }));
};

const getXpTrendLast7Days = async (userId: number): Promise<DailyTrendPoint[]> => {
  await ensureXpEventsTable();

  const result = await pool.query(
    `WITH days AS (
      SELECT generate_series((CURRENT_DATE - INTERVAL '6 days')::date, CURRENT_DATE::date, INTERVAL '1 day')::date AS day
    )
    SELECT
      TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(xe.xp_amount), 0)::int AS value
    FROM days
    LEFT JOIN slime_xp_events xe
      ON xe.user_id = $1
     AND xe.created_at::date = days.day
    GROUP BY days.day
    ORDER BY days.day`,
    [userId],
  );

  return result.rows.map((row) => ({
    date: String(row.date),
    value: Number(row.value ?? 0),
  }));
};

export const getAnalyticsSummary = async (userId: number): Promise<AnalyticsSummary> => {
  const [taskTotalsResult, slimeResult, achievementResult, completedTasksTrend, xpTrend] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks
       FROM tasks
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT level, experience
       FROM slimes
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS unlocked_count
       FROM user_achievements
       WHERE user_id = $1`,
      [userId],
    ),
    getCompletedTasksTrendLast7Days(userId),
    getXpTrendLast7Days(userId),
  ]);

  const totalTasks = Number(taskTotalsResult.rows[0]?.total_tasks ?? 0);
  const completedTasks = Number(taskTotalsResult.rows[0]?.completed_tasks ?? 0);
  const completionRatePercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const slimeRow = slimeResult.rows[0] as { level?: number; experience?: number } | undefined;

  return {
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      completionRatePercent,
      completedLast7Days: completedTasksTrend,
    },
    xp: {
      totalExperience: Number(slimeRow?.experience ?? 0),
      level: Number(slimeRow?.level ?? 1),
      gainedLast7Days: xpTrend,
    },
    achievements: {
      unlockedCount: Number(achievementResult.rows[0]?.unlocked_count ?? 0),
    },
  };
};
