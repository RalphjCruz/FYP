import pool from '../config/database.js';
import { evaluateAndUnlockAchievements, getAchievementProgress } from './achievementService.js';
import { getStudyHealthSnapshot } from './studyHealthService.js';
import { buildSlimeLevelSnapshot } from './xpService.js';

type SlimeWithUserRow = {
  id: number;
  user_id: number;
  name: string;
  level: number;
  experience: number;
  color: string;
  evolution_stage: number;
  created_at: string;
  username: string;
  email: string;
};

export class SlimeProfileServiceError extends Error {
  constructor(
    public readonly code: 'SLIME_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'SlimeProfileServiceError';
  }
}

const findSlimeWithUser = async (userId: number): Promise<SlimeWithUserRow> => {
  const result = await pool.query<SlimeWithUserRow>(
    `SELECT s.*, u.username, u.email
     FROM slimes s
     JOIN users u ON s.user_id = u.id
     WHERE s.user_id = $1`,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new SlimeProfileServiceError('SLIME_NOT_FOUND', 'No slime exists for this user. Create a user first!');
  }

  return row;
};

export type SlimeStatsPayload = {
  id: number;
  name: string;
  level: number;
  experience: number;
  totalExperience: number;
  experienceForNextLevel: number;
  experienceToNextLevel: number;
  levelProgressPercent: number;
  color: string;
  evolutionStage: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  achievements: Array<{
    key: string;
    name: string;
    description: string;
    badgeIcon: string;
    unlockedAt: string;
  }>;
  achievementProgress: Awaited<ReturnType<typeof getAchievementProgress>>;
  studyHealth: {
    currentHp: number;
    maxHp: number;
    dayStreak: number;
    dailyGoalMinutes: number;
    todayFocusedMinutes: number;
    timezoneIana: string;
    lastSettledOnLocal: string;
    hpDeltaCarry: number;
  };
  createdAt: string;
};

type BuildSlimeStatsInput = {
  userId: number;
  simulatedNowUtc?: Date;
};

export const buildSlimeStatsPayload = async ({
  userId,
  simulatedNowUtc,
}: BuildSlimeStatsInput): Promise<SlimeStatsPayload> => {
  const slime = await findSlimeWithUser(userId);
  const studyHealth = await getStudyHealthSnapshot(userId, { nowUtc: simulatedNowUtc });
  const levelSnapshot = buildSlimeLevelSnapshot(Number(slime.experience ?? 0));

  await evaluateAndUnlockAchievements(userId);
  const achievementProgress = await getAchievementProgress(userId);
  const achievements = achievementProgress
    .filter((achievement) => achievement.isUnlocked && achievement.unlockedAt)
    .map((achievement) => ({
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      badgeIcon: achievement.badgeIcon,
      unlockedAt: achievement.unlockedAt as string,
    }));

  return {
    id: slime.id,
    name: slime.name,
    level: levelSnapshot.level,
    experience: levelSnapshot.experienceIntoLevel,
    totalExperience: levelSnapshot.totalExperience,
    experienceForNextLevel: levelSnapshot.experienceForNextLevel,
    experienceToNextLevel: levelSnapshot.experienceToNextLevel,
    levelProgressPercent: levelSnapshot.levelProgressPercent,
    color: slime.color,
    evolutionStage: levelSnapshot.evolutionStage,
    user: {
      id: slime.user_id,
      username: slime.username,
      email: slime.email,
    },
    achievements,
    achievementProgress,
    studyHealth: {
      currentHp: studyHealth.currentHp,
      maxHp: studyHealth.maxHp,
      dayStreak: studyHealth.dayStreak,
      dailyGoalMinutes: studyHealth.dailyGoalMinutes,
      todayFocusedMinutes: studyHealth.todayFocusedMinutes,
      timezoneIana: studyHealth.timezoneIana,
      lastSettledOnLocal: studyHealth.lastSettledOnLocal,
      hpDeltaCarry: studyHealth.hpDeltaCarry,
    },
    createdAt: slime.created_at,
  };
};
