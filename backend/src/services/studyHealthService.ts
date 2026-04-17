import type { PoolClient } from 'pg';
import pool from '../config/database.js';
import { env } from '../config/env.js';
import { evaluateAndUnlockAchievementsWithClient } from './achievementService.js';
import { addXpToSlimeWithClient } from './xpService.js';
import { buildSlimeLevelSnapshot, syncSlimeLevelFromStoredExperience, totalExperienceForLevel } from './xpService.js';

type DbClient = Pick<PoolClient, 'query'>;

type StudyStyle = 'deep_focus' | 'balanced' | 'sprint';
type DistractionLevel = 'low' | 'medium' | 'high';
type SessionIntensity = 1 | 2 | 3 | 4 | 5;

const DEFAULT_GOAL_MINUTES = 180;
const MIN_GOAL_MINUTES = 30;
const MAX_GOAL_MINUTES = 720;
const MAX_SESSION_MINUTES = 720;
const MIN_SESSION_MINUTES = Math.max(1, env.focusMinDurationMinutes);
const BASE_HP = 100;
const HP_PER_LEVEL = 12;
const DAILY_BASE_LOSS = 8;
const LEVEL_DAILY_LOSS_STEP = 2;
const DAILY_BASE_RECOVERY = 5;
const FOCUS_XP_PER_MINUTE = 1;

type StudyStatsRow = {
  day_streak?: number | null;
  last_studied_on_local?: string | Date | null;
  last_level_penalty_on_local?: string | Date | null;
  current_hp?: number | null;
  last_hp_settled_on_local?: string | Date | null;
  current_goal_minutes?: number | null;
  study_style?: string | null;
  preferred_session_intensity?: number | null;
  distraction_level?: string | null;
  timezone_iana?: string | null;
  hp_delta_carry?: number | null;
};

type DailyAggregateRow = {
  local_day: string;
  focused_minutes: number;
  goal_minutes: number;
};

type MutableStudyState = {
  level: number;
  totalExperience: number;
  currentHp: number;
  dayStreak: number;
  lastStudiedOnLocal: string | null;
  lastLevelPenaltyOnLocal: string | null;
  lastHpSettledOnLocal: string;
  currentGoalMinutes: number;
  studyStyle: StudyStyle;
  preferredSessionIntensity: SessionIntensity;
  distractionLevel: DistractionLevel;
  timezoneIana: string;
  hpDeltaCarry: number;
  levelReduced: boolean;
};

export type StudyHealthSnapshot = {
  currentHp: number;
  maxHp: number;
  dayStreak: number;
  dailyGoalMinutes: number;
  todayFocusedMinutes: number;
  timezoneIana: string;
  lastSettledOnLocal: string;
  hpDeltaCarry: number;
  level: number;
  levelReduced: boolean;
};

export type UpdateStudyProfileInput = {
  targetDailyMinutes?: number;
  studyStyle?: string;
  preferredSessionIntensity?: number;
  distractionLevel?: string;
  timezoneIana?: string;
  nowUtc?: Date;
};

export type RecordFocusSessionInput = {
  draftId: number;
  completedAtUtc?: Date;
  timezoneIana?: string;
};

type FocusSessionDraftStatus = 'active' | 'completed' | 'invalidated';

type FocusSessionDraftRow = {
  id: number;
  user_id: number;
  status: FocusSessionDraftStatus;
  started_at_utc: string;
  timezone_iana: string;
  local_day_key: string;
};

export type FocusSessionDraftSnapshot = {
  draftId: number;
  status: FocusSessionDraftStatus;
  startedAtUtc: string;
  timezoneIana: string;
  localDayKey: string;
};

export type DailyHpSettlementInput = {
  level: number;
  currentHp: number;
  focusedMinutes: number;
  goalMinutes: number;
  hpDeltaCarry: number;
  penaltyAlreadyAppliedForDay: boolean;
};

export type DailyHpSettlementResult = {
  dailyDelta: number;
  appliedDelta: number;
  nextCarry: number;
  nextHp: number;
  nextLevel: number;
  levelReduced: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeDayKey = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const compareDayKeys = (leftDayKey: string, rightDayKey: string) => leftDayKey.localeCompare(rightDayKey);

const addDaysToDayKey = (dayKey: string, dayOffset: number): string => {
  const base = new Date(`${dayKey}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return base.toISOString().slice(0, 10);
};

const getLocalDayKey = (utcDate: Date, timezoneIana: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezoneIana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(utcDate);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
};

const normalizeDate = (value: unknown, fallback = new Date()): Date => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  return fallback;
};

export const normalizeTimezoneIana = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'UTC';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'UTC';
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return 'UTC';
  }
};

const normalizeStudyStyle = (value: unknown): StudyStyle => {
  if (value === 'deep_focus' || value === 'balanced' || value === 'sprint') {
    return value;
  }

  return 'balanced';
};

const normalizeDistractionLevel = (value: unknown): DistractionLevel => {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return 'medium';
};

const normalizeSessionIntensity = (value: unknown): SessionIntensity => {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) {
    return parsed;
  }

  return 3;
};

const normalizeGoalMinutes = (value: unknown): number => {
  return clamp(Math.round(Number(value) || DEFAULT_GOAL_MINUTES), MIN_GOAL_MINUTES, MAX_GOAL_MINUTES);
};

const normalizeSessionMinutes = (value: unknown): number => {
  return clamp(Math.round(Number(value) || 0), 1, MAX_SESSION_MINUTES);
};

export const getMaxHpByLevel = (level: number): number => {
  return BASE_HP + Math.max(0, level - 1) * HP_PER_LEVEL;
};

export const calculateDailyHpDelta = (level: number, focusedMinutes: number, goalMinutes: number): number => {
  const safeFocused = clamp(Math.round(focusedMinutes), 0, MAX_GOAL_MINUTES * 2);
  const safeGoal = normalizeGoalMinutes(goalMinutes);
  const progressRaw = safeFocused / safeGoal;
  const progress = clamp(progressRaw, 0, 1);
  const dailyLoss = DAILY_BASE_LOSS + Math.max(0, level - 1) * LEVEL_DAILY_LOSS_STEP;
  const dailyRecovery = DAILY_BASE_RECOVERY + Math.max(0, Math.floor((level - 1) / 2));

  // No study -> full daily loss.
  if (safeFocused <= 0) {
    return -dailyLoss;
  }

  // Under goal -> proportional HP loss (e.g. 50% progress => 50% of usual loss).
  if (progress < 1) {
    return -(dailyLoss * (1 - progress));
  }

  // Goal reached/exceeded -> recover HP (scaled for over-goal days).
  if (progressRaw >= 1) {
    return dailyRecovery * progressRaw;
  }

  return dailyRecovery;
};

export const applyDailyHpSettlement = (input: DailyHpSettlementInput): DailyHpSettlementResult => {
  const safeLevel = Math.max(1, Math.round(input.level));
  const maxHp = getMaxHpByLevel(safeLevel);
  const hpBase = clamp(Math.round(input.currentHp), 0, maxHp);
  const dailyDelta = calculateDailyHpDelta(safeLevel, input.focusedMinutes, input.goalMinutes);
  const safeCarry = Number.isFinite(input.hpDeltaCarry) ? input.hpDeltaCarry : 0;
  const deltaWithCarry = dailyDelta + safeCarry;
  const appliedDelta = deltaWithCarry >= 0 ? Math.floor(deltaWithCarry) : Math.ceil(deltaWithCarry);
  const nextCarry = deltaWithCarry - appliedDelta;
  const nextHpBeforePenalty = clamp(hpBase + appliedDelta, 0, maxHp);

  if (nextHpBeforePenalty <= 0 && safeLevel > 1 && !input.penaltyAlreadyAppliedForDay) {
    return {
      dailyDelta,
      appliedDelta,
      nextCarry,
      nextHp: 1,
      nextLevel: safeLevel - 1,
      levelReduced: true,
    };
  }

  return {
    dailyDelta,
    appliedDelta,
    nextCarry,
    nextHp: nextHpBeforePenalty,
    nextLevel: safeLevel,
    levelReduced: false,
  };
};

export const ensureStudyHealthSchema = async (db: DbClient = pool) => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS user_study_stats (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      day_streak INTEGER NOT NULL DEFAULT 0,
      last_studied_on_local DATE NULL,
      last_level_penalty_on_local DATE NULL,
      current_hp INTEGER NULL,
      last_hp_settled_on_local DATE NULL,
      current_goal_minutes INTEGER NOT NULL DEFAULT 180,
      study_style VARCHAR(32) NOT NULL DEFAULT 'balanced',
      preferred_session_intensity INTEGER NOT NULL DEFAULT 3,
      distraction_level VARCHAR(16) NOT NULL DEFAULT 'medium',
      timezone_iana VARCHAR(64) NOT NULL DEFAULT 'UTC',
      hp_delta_carry DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS day_streak INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS last_studied_on_local DATE NULL`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS last_level_penalty_on_local DATE NULL`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS current_hp INTEGER NULL`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS last_hp_settled_on_local DATE NULL`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS current_goal_minutes INTEGER NOT NULL DEFAULT 180`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS study_style VARCHAR(32) NOT NULL DEFAULT 'balanced'`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS preferred_session_intensity INTEGER NOT NULL DEFAULT 3`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS distraction_level VARCHAR(16) NOT NULL DEFAULT 'medium'`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS timezone_iana VARCHAR(64) NOT NULL DEFAULT 'UTC'`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS hp_delta_carry DOUBLE PRECISION NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE user_study_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);

  await db.query(
    `CREATE TABLE IF NOT EXISTS focus_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      duration_minutes INTEGER NOT NULL,
      completed_at_utc TIMESTAMP NOT NULL,
      timezone_iana VARCHAR(64) NOT NULL,
      local_day_key DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS focus_session_drafts (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      started_at_utc TIMESTAMP NOT NULL,
      completed_at_utc TIMESTAMP NULL,
      invalidated_at TIMESTAMP NULL,
      timezone_iana VARCHAR(64) NOT NULL DEFAULT 'UTC',
      local_day_key DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS user_study_daily (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      local_day DATE NOT NULL,
      focused_minutes INTEGER NOT NULL DEFAULT 0,
      goal_minutes INTEGER NOT NULL DEFAULT 180,
      session_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, local_day)
    )`,
  );

  await db.query(`CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_day ON focus_sessions (user_id, local_day_key)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed ON focus_sessions (user_id, completed_at_utc DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_focus_session_drafts_user_status ON focus_session_drafts (user_id, status)`);
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_session_drafts_one_active_per_user
     ON focus_session_drafts(user_id)
     WHERE status = 'active'`,
  );
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_study_daily_user_day ON user_study_daily (user_id, local_day)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_study_stats_last_studied_local ON user_study_stats (last_studied_on_local)`);

  const legacyLastStudiedColumnResult = await db.query<{ has_column: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'user_study_stats'
         AND column_name = 'last_studied_on'
     ) AS has_column`,
  );

  if (legacyLastStudiedColumnResult.rows[0]?.has_column) {
    await db.query(
      `UPDATE user_study_stats
       SET last_studied_on_local = COALESCE(last_studied_on_local, last_studied_on)
       WHERE last_studied_on_local IS NULL`,
    );
  }
};

const readStudyStatsForUpdate = async (db: DbClient, userId: number): Promise<StudyStatsRow | null> => {
  const result = await db.query(
    `SELECT day_streak, last_studied_on_local, last_level_penalty_on_local, current_hp, last_hp_settled_on_local,
            current_goal_minutes, study_style, preferred_session_intensity, distraction_level, timezone_iana,
            hp_delta_carry
     FROM user_study_stats
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
  );

  return (result.rows[0] as StudyStatsRow | undefined) ?? null;
};

const insertDefaultStudyStats = async (
  db: DbClient,
  userId: number,
  level: number,
  timezoneIana: string,
  nowUtc: Date,
) => {
  const localToday = getLocalDayKey(nowUtc, timezoneIana);
  const baselineSettled = addDaysToDayKey(localToday, -1);
  const maxHp = getMaxHpByLevel(level);

  await db.query(
    `INSERT INTO user_study_stats (
      user_id,
      day_streak,
      current_hp,
      last_hp_settled_on_local,
      current_goal_minutes,
      study_style,
      preferred_session_intensity,
      distraction_level,
      timezone_iana,
      hp_delta_carry,
      updated_at
    )
     VALUES ($1, 0, $2, $3::date, $4, 'balanced', 3, 'medium', $5, 0, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, maxHp, baselineSettled, DEFAULT_GOAL_MINUTES, timezoneIana],
  );
};

const persistStudyState = async (db: DbClient, userId: number, state: MutableStudyState) => {
  await db.query(
    `UPDATE user_study_stats
     SET day_streak = $2,
         last_studied_on_local = $3::date,
         last_level_penalty_on_local = $4::date,
         current_hp = $5,
         last_hp_settled_on_local = $6::date,
         current_goal_minutes = $7,
         study_style = $8,
         preferred_session_intensity = $9,
         distraction_level = $10,
         timezone_iana = $11,
         hp_delta_carry = $12,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [
      userId,
      state.dayStreak,
      state.lastStudiedOnLocal,
      state.lastLevelPenaltyOnLocal,
      state.currentHp,
      state.lastHpSettledOnLocal,
      state.currentGoalMinutes,
      state.studyStyle,
      state.preferredSessionIntensity,
      state.distractionLevel,
      state.timezoneIana,
      state.hpDeltaCarry,
    ],
  );
};

const readDailyAggregateRange = async (
  db: DbClient,
  userId: number,
  fromDayKey: string,
  toDayKey: string,
): Promise<Map<string, DailyAggregateRow>> => {
  const result = await db.query(
    `SELECT local_day::text AS local_day, focused_minutes, goal_minutes
     FROM user_study_daily
     WHERE user_id = $1
       AND local_day BETWEEN $2::date AND $3::date`,
    [userId, fromDayKey, toDayKey],
  );

  const map = new Map<string, DailyAggregateRow>();
  for (const row of result.rows as Array<{ local_day: string; focused_minutes: number; goal_minutes: number }>) {
    map.set(row.local_day.slice(0, 10), {
      local_day: row.local_day.slice(0, 10),
      focused_minutes: Number(row.focused_minutes ?? 0),
      goal_minutes: Number(row.goal_minutes ?? DEFAULT_GOAL_MINUTES),
    });
  }
  return map;
};

const getTodayFocusedMinutes = async (
  db: DbClient,
  userId: number,
  localTodayKey: string,
): Promise<number> => {
  const result = await db.query(
    `SELECT focused_minutes
     FROM user_study_daily
     WHERE user_id = $1
       AND local_day = $2::date`,
    [userId, localTodayKey],
  );

  if (result.rows.length === 0) {
    return 0;
  }

  return Math.max(0, Number(result.rows[0].focused_minutes ?? 0));
};

const lockSlimeLevelState = async (
  db: DbClient,
  userId: number,
): Promise<{ level: number; totalExperience: number }> => {
  const slimeResult = await db.query(
    `SELECT experience
     FROM slimes
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
  );

  if (slimeResult.rows.length === 0) {
    throw new Error('Slime not found for user');
  }

  const totalExperience = Number(slimeResult.rows[0].experience ?? 0);
  const levelSnapshot = buildSlimeLevelSnapshot(totalExperience);

  return {
    level: levelSnapshot.level,
    totalExperience: levelSnapshot.totalExperience,
  };
};

const initializeLockedStudyState = async (
  db: DbClient,
  userId: number,
  timezoneOverride: string | null,
  nowUtc: Date,
): Promise<MutableStudyState> => {
  const slimeState = await lockSlimeLevelState(db, userId);
  const requestedTimezone = normalizeTimezoneIana(timezoneOverride);

  await insertDefaultStudyStats(db, userId, slimeState.level, requestedTimezone, nowUtc);
  const statsRow = await readStudyStatsForUpdate(db, userId);

  if (!statsRow) {
    throw new Error('Failed to initialize user study stats');
  }

  const resolvedTimezone = normalizeTimezoneIana(timezoneOverride ?? statsRow.timezone_iana ?? 'UTC');
  const maxHp = getMaxHpByLevel(slimeState.level);
  const localTodayKey = getLocalDayKey(nowUtc, resolvedTimezone);
  const fallbackLastSettled = addDaysToDayKey(localTodayKey, -1);

  return {
    level: slimeState.level,
    totalExperience: slimeState.totalExperience,
    currentHp: clamp(Math.round(Number(statsRow.current_hp ?? maxHp)), 0, maxHp),
    dayStreak: Math.max(0, Math.round(Number(statsRow.day_streak ?? 0))),
    lastStudiedOnLocal: normalizeDayKey(statsRow.last_studied_on_local),
    lastLevelPenaltyOnLocal: normalizeDayKey(statsRow.last_level_penalty_on_local),
    lastHpSettledOnLocal: normalizeDayKey(statsRow.last_hp_settled_on_local) ?? fallbackLastSettled,
    currentGoalMinutes: normalizeGoalMinutes(statsRow.current_goal_minutes ?? DEFAULT_GOAL_MINUTES),
    studyStyle: normalizeStudyStyle(statsRow.study_style),
    preferredSessionIntensity: normalizeSessionIntensity(statsRow.preferred_session_intensity),
    distractionLevel: normalizeDistractionLevel(statsRow.distraction_level),
    timezoneIana: resolvedTimezone,
    hpDeltaCarry: Number.isFinite(Number(statsRow.hp_delta_carry)) ? Number(statsRow.hp_delta_carry) : 0,
    levelReduced: false,
  };
};

const settleUnprocessedDaysWithClient = async (
  db: DbClient,
  userId: number,
  state: MutableStudyState,
  nowUtc: Date,
) => {
  const localTodayKey = getLocalDayKey(nowUtc, state.timezoneIana);
  const localYesterdayKey = addDaysToDayKey(localTodayKey, -1);
  const firstUnprocessedDay = addDaysToDayKey(state.lastHpSettledOnLocal, 1);

  if (compareDayKeys(firstUnprocessedDay, localYesterdayKey) > 0) {
    return;
  }

  const dailyAggregates = await readDailyAggregateRange(db, userId, firstUnprocessedDay, localYesterdayKey);
  let dayCursor = firstUnprocessedDay;

  while (compareDayKeys(dayCursor, localYesterdayKey) <= 0) {
    const aggregate = dailyAggregates.get(dayCursor);
    const focusedMinutes = clamp(Math.round(aggregate?.focused_minutes ?? 0), 0, MAX_GOAL_MINUTES * 2);
    const goalMinutes = normalizeGoalMinutes(aggregate?.goal_minutes ?? state.currentGoalMinutes);

    if (focusedMinutes > 0) {
      const previousDay = addDaysToDayKey(dayCursor, -1);
      if (state.lastStudiedOnLocal === previousDay) {
        state.dayStreak = Math.max(1, state.dayStreak + 1);
      } else if (state.lastStudiedOnLocal !== dayCursor) {
        state.dayStreak = 1;
      }

      state.lastStudiedOnLocal = dayCursor;
    } else {
      state.dayStreak = 0;
    }

    const settlement = applyDailyHpSettlement({
      level: state.level,
      currentHp: state.currentHp,
      focusedMinutes,
      goalMinutes,
      hpDeltaCarry: state.hpDeltaCarry,
      penaltyAlreadyAppliedForDay: state.lastLevelPenaltyOnLocal === dayCursor,
    });
    state.hpDeltaCarry = settlement.nextCarry;

    if (settlement.levelReduced) {
      const penalizedExperience = totalExperienceForLevel(settlement.nextLevel);
      const penalizedSnapshot = await syncSlimeLevelFromStoredExperience(db, userId, penalizedExperience);
      state.level = penalizedSnapshot.level;
      state.totalExperience = penalizedSnapshot.totalExperience;
      state.currentHp = clamp(settlement.nextHp, 1, getMaxHpByLevel(state.level));
      state.lastLevelPenaltyOnLocal = dayCursor;
      state.levelReduced = true;
    } else {
      state.level = settlement.nextLevel;
      state.currentHp = clamp(settlement.nextHp, 0, getMaxHpByLevel(state.level));
    }

    state.lastHpSettledOnLocal = dayCursor;
    dayCursor = addDaysToDayKey(dayCursor, 1);
  }
};

const buildStudyHealthSnapshotWithClient = async (
  db: DbClient,
  userId: number,
  state: MutableStudyState,
  nowUtc: Date,
): Promise<StudyHealthSnapshot> => {
  const localTodayKey = getLocalDayKey(nowUtc, state.timezoneIana);
  const todayFocusedMinutes = await getTodayFocusedMinutes(db, userId, localTodayKey);
  const maxHp = getMaxHpByLevel(state.level);
  const safeHp = clamp(Math.round(state.currentHp), 0, maxHp);

  return {
    currentHp: safeHp,
    maxHp,
    dayStreak: Math.max(0, state.dayStreak),
    dailyGoalMinutes: state.currentGoalMinutes,
    todayFocusedMinutes,
    timezoneIana: state.timezoneIana,
    lastSettledOnLocal: state.lastHpSettledOnLocal,
    hpDeltaCarry: state.hpDeltaCarry,
    level: state.level,
    levelReduced: state.levelReduced,
  };
};

const mapFocusDraftSnapshot = (row: FocusSessionDraftRow): FocusSessionDraftSnapshot => ({
  draftId: row.id,
  status: row.status,
  startedAtUtc: new Date(row.started_at_utc).toISOString(),
  timezoneIana: row.timezone_iana,
  localDayKey: row.local_day_key.slice(0, 10),
});

const lockFocusDraftById = async (
  db: DbClient,
  userId: number,
  draftId: number,
): Promise<FocusSessionDraftRow | null> => {
  const result = await db.query<FocusSessionDraftRow>(
    `SELECT id, user_id, status, started_at_utc, timezone_iana, local_day_key::text AS local_day_key
     FROM focus_session_drafts
     WHERE user_id = $1
       AND id = $2
     FOR UPDATE`,
    [userId, draftId],
  );

  return result.rows[0] ?? null;
};

const invalidateActiveFocusDraftsForUser = async (db: DbClient, userId: number) => {
  await db.query(
    `UPDATE focus_session_drafts
     SET status = 'invalidated',
         invalidated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND status = 'active'`,
    [userId],
  );
};

export const startFocusSessionDraft = async (
  userId: number,
  input: { timezoneIana?: string; startedAtUtc?: Date } = {},
): Promise<FocusSessionDraftSnapshot> => {
  const startedAtUtc = normalizeDate(input.startedAtUtc);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudyHealthSchema(client);

    const state = await initializeLockedStudyState(client, userId, normalizeTimezoneIana(input.timezoneIana), startedAtUtc);
    await settleUnprocessedDaysWithClient(client, userId, state, startedAtUtc);
    await invalidateActiveFocusDraftsForUser(client, userId);

    const localDayKey = getLocalDayKey(startedAtUtc, state.timezoneIana);
    const insertResult = await client.query<FocusSessionDraftRow>(
      `INSERT INTO focus_session_drafts (
          user_id,
          status,
          started_at_utc,
          timezone_iana,
          local_day_key,
          created_at,
          updated_at
       )
       VALUES ($1, 'active', $2, $3, $4::date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, user_id, status, started_at_utc, timezone_iana, local_day_key::text AS local_day_key`,
      [userId, startedAtUtc.toISOString(), state.timezoneIana, localDayKey],
    );

    await persistStudyState(client, userId, state);
    await client.query('COMMIT');
    return mapFocusDraftSnapshot(insertResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getStudyHealthSnapshot = async (userId: number, input: { nowUtc?: Date } = {}): Promise<StudyHealthSnapshot> => {
  const nowUtc = normalizeDate(input.nowUtc);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudyHealthSchema(client);
    const state = await initializeLockedStudyState(client, userId, null, nowUtc);
    await settleUnprocessedDaysWithClient(client, userId, state, nowUtc);
    await persistStudyState(client, userId, state);
    const snapshot = await buildStudyHealthSnapshotWithClient(client, userId, state, nowUtc);
    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateStudyProfile = async (userId: number, input: UpdateStudyProfileInput): Promise<StudyHealthSnapshot> => {
  const nowUtc = normalizeDate(input.nowUtc);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudyHealthSchema(client);
    const state = await initializeLockedStudyState(client, userId, normalizeTimezoneIana(input.timezoneIana), nowUtc);
    await settleUnprocessedDaysWithClient(client, userId, state, nowUtc);

    state.currentGoalMinutes = normalizeGoalMinutes(input.targetDailyMinutes ?? state.currentGoalMinutes);
    state.studyStyle = normalizeStudyStyle(input.studyStyle ?? state.studyStyle);
    state.preferredSessionIntensity = normalizeSessionIntensity(input.preferredSessionIntensity ?? state.preferredSessionIntensity);
    state.distractionLevel = normalizeDistractionLevel(input.distractionLevel ?? state.distractionLevel);
    state.timezoneIana = normalizeTimezoneIana(input.timezoneIana ?? state.timezoneIana);

    const localTodayKey = getLocalDayKey(nowUtc, state.timezoneIana);
    await client.query(
      `INSERT INTO user_study_daily (user_id, local_day, focused_minutes, goal_minutes, session_count, updated_at)
       VALUES ($1, $2::date, 0, $3, 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, local_day)
       DO UPDATE SET
         goal_minutes = EXCLUDED.goal_minutes,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, localTodayKey, state.currentGoalMinutes],
    );

    await persistStudyState(client, userId, state);
    const snapshot = await buildStudyHealthSnapshotWithClient(client, userId, state, nowUtc);
    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordFocusSessionCompletion = async (
  userId: number,
  input: RecordFocusSessionInput,
): Promise<StudyHealthSnapshot> => {
  const completedAtUtc = normalizeDate(input.completedAtUtc);
  const safeDraftId = Math.max(0, Math.round(Number(input.draftId)));
  if (!Number.isInteger(safeDraftId) || safeDraftId <= 0) {
    throw new Error('draftId must be a positive integer');
  }
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudyHealthSchema(client);

    const lockedDraft = await lockFocusDraftById(client, userId, safeDraftId);
    if (!lockedDraft) {
      throw new Error('Active focus draft not found');
    }

    if (lockedDraft.status !== 'active') {
      throw new Error('Focus draft is no longer active');
    }

    const startedAtUtc = new Date(lockedDraft.started_at_utc);
    const elapsedMinutes = Math.floor((completedAtUtc.getTime() - startedAtUtc.getTime()) / (60 * 1000));
    if (elapsedMinutes < MIN_SESSION_MINUTES) {
      throw new Error(`Focus session must be at least ${MIN_SESSION_MINUTES} minutes`);
    }

    const durationMinutes = normalizeSessionMinutes(elapsedMinutes);
    const state = await initializeLockedStudyState(
      client,
      userId,
      normalizeTimezoneIana(input.timezoneIana ?? lockedDraft.timezone_iana),
      completedAtUtc,
    );
    await settleUnprocessedDaysWithClient(client, userId, state, completedAtUtc);

    const localDayKey = getLocalDayKey(completedAtUtc, state.timezoneIana);
    const draftUpdate = await client.query<{ id: number }>(
      `UPDATE focus_session_drafts
       SET status = 'completed',
           completed_at_utc = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND user_id = $2
         AND status = 'active'
       RETURNING id`,
      [safeDraftId, userId, completedAtUtc.toISOString()],
    );
    if (draftUpdate.rows.length === 0) {
      throw new Error('Focus draft is no longer active');
    }

    await client.query(
      `INSERT INTO focus_sessions (user_id, duration_minutes, completed_at_utc, timezone_iana, local_day_key)
       VALUES ($1, $2, $3, $4, $5::date)`,
      [userId, durationMinutes, completedAtUtc.toISOString(), state.timezoneIana, localDayKey],
    );

    await client.query(
      `INSERT INTO user_study_daily (user_id, local_day, focused_minutes, goal_minutes, session_count, updated_at)
       VALUES ($1, $2::date, $3, $4, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, local_day)
       DO UPDATE SET
         focused_minutes = user_study_daily.focused_minutes + EXCLUDED.focused_minutes,
         goal_minutes = EXCLUDED.goal_minutes,
         session_count = user_study_daily.session_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, localDayKey, durationMinutes, state.currentGoalMinutes],
    );

    const xpAwarded = Math.max(1, Math.round(durationMinutes * FOCUS_XP_PER_MINUTE));
    const xpSnapshot = await addXpToSlimeWithClient(client, userId, xpAwarded, 'focus_session_complete');
    state.level = xpSnapshot.level;
    state.totalExperience = xpSnapshot.totalExperience;

    const previousDay = addDaysToDayKey(localDayKey, -1);
    if (state.lastStudiedOnLocal === previousDay) {
      state.dayStreak = Math.max(1, state.dayStreak + 1);
    } else if (state.lastStudiedOnLocal !== localDayKey) {
      state.dayStreak = 1;
    }
    state.lastStudiedOnLocal = localDayKey;
    await evaluateAndUnlockAchievementsWithClient(client, userId);

    await persistStudyState(client, userId, state);
    const snapshot = await buildStudyHealthSnapshotWithClient(client, userId, state, completedAtUtc);
    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const resetStudyProgressDev = async (
  userId: number,
  input: { nowUtc?: Date } = {},
): Promise<StudyHealthSnapshot> => {
  const nowUtc = normalizeDate(input.nowUtc);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudyHealthSchema(client);
    const state = await initializeLockedStudyState(client, userId, null, nowUtc);

    await client.query(
      `DELETE FROM focus_sessions
       WHERE user_id = $1`,
      [userId],
    );

    await client.query(
      `DELETE FROM focus_session_drafts
       WHERE user_id = $1`,
      [userId],
    );

    await client.query(
      `DELETE FROM user_study_daily
       WHERE user_id = $1`,
      [userId],
    );

    const localTodayKey = getLocalDayKey(nowUtc, state.timezoneIana);
    state.dayStreak = 0;
    state.lastStudiedOnLocal = null;
    state.lastLevelPenaltyOnLocal = null;
    state.currentHp = getMaxHpByLevel(state.level);
    state.lastHpSettledOnLocal = addDaysToDayKey(localTodayKey, -1);
    state.hpDeltaCarry = 0;
    state.levelReduced = false;

    await persistStudyState(client, userId, state);
    const snapshot = await buildStudyHealthSnapshotWithClient(client, userId, state, nowUtc);
    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
