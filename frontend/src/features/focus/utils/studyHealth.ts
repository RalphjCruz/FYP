import type { StudySurveyInput } from '../types';

export const FOCUS_TIMER_STORAGE_KEY = 'myslime.focusTimer.v3';
export const FOCUS_SURVEY_STORAGE_KEY = 'myslime.focusSurvey.v1';

const MIN_DAILY_TARGET_MINUTES = 30;
const MAX_DAILY_TARGET_MINUTES = 720;
const DEFAULT_DAILY_TARGET_MINUTES = 180;
const DEFAULT_FOCUS_DURATION_MS = 35 * 60 * 1000;
const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIN_HEALTH_PERCENTAGE = 0;
const MAX_HEALTH_PERCENTAGE = 100;

type StoredSurveyState = {
  draft?: unknown;
  applied?: unknown;
};

type StoredFocusTimerState = {
  durationMs?: number;
  isRunning?: boolean;
  remainingMs?: number;
  endAtMs?: number | null;
  completedSessions?: number;
  totalFocusedMs?: number;
  dailyFocusedMs?: number;
  dailyFocusDateKey?: string;
  [key: string]: unknown;
};

type StudyHealthStatus = 'Critical' | 'Low' | 'Steady' | 'Strong' | 'Peak';

export type StudyHealthSnapshot = {
  healthPercentage: number;
  healthStatus: StudyHealthStatus;
  totalFocusedMinutes: number;
  todayFocusedMinutes: number;
  targetDailyMinutes: number;
  studyStyle: StudySurveyInput['studyStyle'];
  preferredSessionIntensity: StudySurveyInput['preferredSessionIntensity'];
  distractionLevel: StudySurveyInput['distractionLevel'];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getCurrentLocalDayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDailyTargetMinutes = (value: unknown): number => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_DAILY_TARGET_MINUTES;
  }

  const survey = value as Partial<StudySurveyInput>;
  const rawMinutes = Number(survey.availableMinutesPerDay);

  if (!Number.isFinite(rawMinutes)) {
    return DEFAULT_DAILY_TARGET_MINUTES;
  }

  return clamp(Math.round(rawMinutes), MIN_DAILY_TARGET_MINUTES, MAX_DAILY_TARGET_MINUTES);
};

const normalizeSurveyState = (value: unknown): StudySurveyInput => {
  if (!value || typeof value !== 'object') {
    return {
      studyStyle: 'balanced',
      availableMinutesPerDay: DEFAULT_DAILY_TARGET_MINUTES,
      preferredSessionIntensity: 3,
      distractionLevel: 'medium',
    };
  }

  const candidate = value as Partial<StudySurveyInput>;

  return {
    studyStyle:
      candidate.studyStyle === 'deep_focus' || candidate.studyStyle === 'balanced' || candidate.studyStyle === 'sprint'
        ? candidate.studyStyle
        : 'balanced',
    availableMinutesPerDay: parseDailyTargetMinutes(candidate),
    preferredSessionIntensity:
      candidate.preferredSessionIntensity === 1
      || candidate.preferredSessionIntensity === 2
      || candidate.preferredSessionIntensity === 3
      || candidate.preferredSessionIntensity === 4
      || candidate.preferredSessionIntensity === 5
        ? candidate.preferredSessionIntensity
        : 3,
    distractionLevel:
      candidate.distractionLevel === 'low' || candidate.distractionLevel === 'medium' || candidate.distractionLevel === 'high'
        ? candidate.distractionLevel
        : 'medium',
  };
};

const getStudyHealthStatus = (healthPercentage: number): StudyHealthStatus => {
  if (healthPercentage < 20) {
    return 'Critical';
  }

  if (healthPercentage < 45) {
    return 'Low';
  }

  if (healthPercentage < 70) {
    return 'Steady';
  }

  if (healthPercentage < 90) {
    return 'Strong';
  }

  return 'Peak';
};

const readStoredSurveyTargetMinutes = (): number => {
  try {
    const raw = window.localStorage.getItem(FOCUS_SURVEY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DAILY_TARGET_MINUTES;
    }

    const parsed = JSON.parse(raw) as StoredSurveyState;
    return parseDailyTargetMinutes(parsed.applied);
  } catch {
    return DEFAULT_DAILY_TARGET_MINUTES;
  }
};

const readStoredSurveyProfile = (): StudySurveyInput => {
  try {
    const raw = window.localStorage.getItem(FOCUS_SURVEY_STORAGE_KEY);
    if (!raw) {
      return normalizeSurveyState(null);
    }

    const parsed = JSON.parse(raw) as StoredSurveyState;
    return normalizeSurveyState(parsed.applied);
  } catch {
    return normalizeSurveyState(null);
  }
};

const readStoredFocusState = (): StoredFocusTimerState | null => {
  try {
    const raw = window.localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredFocusTimerState>;
    return parsed;
  } catch {
    return null;
  }
};

const getTodayFocusedMinutes = (timerState: StoredFocusTimerState | null): number => {
  if (!timerState) {
    return 0;
  }

  const todayKey = getCurrentLocalDayKey();
  const storedDateKey = DAY_KEY_REGEX.test(timerState.dailyFocusDateKey ?? '') ? timerState.dailyFocusDateKey : todayKey;
  const totalFocusedMs = typeof timerState.totalFocusedMs === 'number' && timerState.totalFocusedMs >= 0 ? timerState.totalFocusedMs : 0;
  const focusedMs =
    typeof timerState.dailyFocusedMs === 'number' && timerState.dailyFocusedMs >= 0
      ? timerState.dailyFocusedMs
      : totalFocusedMs;

  if (storedDateKey !== todayKey) {
    return 0;
  }

  return Math.max(0, Math.floor(focusedMs / 60000));
};

const getTotalFocusedMinutes = (timerState: StoredFocusTimerState | null): number => {
  if (!timerState) {
    return 0;
  }

  const totalFocusedMs = typeof timerState.totalFocusedMs === 'number' && timerState.totalFocusedMs >= 0 ? timerState.totalFocusedMs : 0;
  return Math.max(0, Math.floor(totalFocusedMs / 60000));
};

const writeStoredSurveyTargetMinutes = (targetDailyMinutes: number) => {
  const nextTarget = clamp(Math.round(targetDailyMinutes), MIN_DAILY_TARGET_MINUTES, MAX_DAILY_TARGET_MINUTES);

  let currentState: StoredSurveyState = {};
  try {
    const raw = window.localStorage.getItem(FOCUS_SURVEY_STORAGE_KEY);
    if (raw) {
      currentState = JSON.parse(raw) as StoredSurveyState;
    }
  } catch {
    currentState = {};
  }

  const nextDraft = normalizeSurveyState(currentState.draft);
  const nextApplied = normalizeSurveyState(currentState.applied);

  nextDraft.availableMinutesPerDay = nextTarget;
  nextApplied.availableMinutesPerDay = nextTarget;

  window.localStorage.setItem(
    FOCUS_SURVEY_STORAGE_KEY,
    JSON.stringify({
      draft: nextDraft,
      applied: nextApplied,
    } satisfies StoredSurveyState),
  );
};

const writeStoredTodayFocusedMinutes = (todayFocusedMinutes: number, options: { preserveTotal?: boolean } = {}) => {
  const { preserveTotal = false } = options;
  const nextDailyFocusedMs = Math.max(0, Math.round(todayFocusedMinutes) * 60000);
  const todayKey = getCurrentLocalDayKey();

  let currentState: StoredFocusTimerState = {};
  try {
    const raw = window.localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
    if (raw) {
      currentState = JSON.parse(raw) as StoredFocusTimerState;
    }
  } catch {
    currentState = {};
  }

  const safeDurationMs =
    typeof currentState.durationMs === 'number' && currentState.durationMs > 0 ? currentState.durationMs : DEFAULT_FOCUS_DURATION_MS;
  const safeTotalFocusedMs =
    typeof currentState.totalFocusedMs === 'number' && currentState.totalFocusedMs >= 0 ? currentState.totalFocusedMs : 0;
  const storedDateKey = DAY_KEY_REGEX.test(currentState.dailyFocusDateKey ?? '') ? currentState.dailyFocusDateKey : todayKey;
  const currentDailyFocusedMs =
    storedDateKey === todayKey && typeof currentState.dailyFocusedMs === 'number' && currentState.dailyFocusedMs >= 0
      ? currentState.dailyFocusedMs
      : 0;
  const totalDelta = nextDailyFocusedMs - currentDailyFocusedMs;

  const nextState: StoredFocusTimerState = {
    ...currentState,
    durationMs: safeDurationMs,
    isRunning: false,
    remainingMs: safeDurationMs,
    endAtMs: null,
    completedSessions:
      typeof currentState.completedSessions === 'number' && currentState.completedSessions >= 0 ? currentState.completedSessions : 0,
    totalFocusedMs: preserveTotal ? safeTotalFocusedMs : Math.max(0, safeTotalFocusedMs + totalDelta),
    dailyFocusDateKey: todayKey,
    dailyFocusedMs: nextDailyFocusedMs,
  };

  window.localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(nextState));
};

export const getStudyHealthSnapshot = (): StudyHealthSnapshot => {
  const surveyProfile = readStoredSurveyProfile();
  const targetDailyMinutes = surveyProfile.availableMinutesPerDay ?? readStoredSurveyTargetMinutes();
  const focusState = readStoredFocusState();
  const todayFocusedMinutes = getTodayFocusedMinutes(focusState);
  const totalFocusedMinutes = getTotalFocusedMinutes(focusState);
  const healthPercentage =
    targetDailyMinutes > 0 ? clamp((todayFocusedMinutes / targetDailyMinutes) * 100, 0, 100) : 0;

  return {
    healthPercentage,
    healthStatus: getStudyHealthStatus(healthPercentage),
    totalFocusedMinutes,
    todayFocusedMinutes,
    targetDailyMinutes,
    studyStyle: surveyProfile.studyStyle,
    preferredSessionIntensity: surveyProfile.preferredSessionIntensity,
    distractionLevel: surveyProfile.distractionLevel,
  };
};

export const setStudyTargetMinutesDev = (targetDailyMinutes: number): StudyHealthSnapshot => {
  writeStoredSurveyTargetMinutes(targetDailyMinutes);
  return getStudyHealthSnapshot();
};

export const setTodayFocusedMinutesDev = (todayFocusedMinutes: number): StudyHealthSnapshot => {
  writeStoredTodayFocusedMinutes(todayFocusedMinutes);
  return getStudyHealthSnapshot();
};

export const resetTodayFocusedMinutesDevPreserveTotal = (): StudyHealthSnapshot => {
  writeStoredTodayFocusedMinutes(0, { preserveTotal: true });
  return getStudyHealthSnapshot();
};

export const adjustTodayFocusedMinutesDev = (deltaMinutes: number): StudyHealthSnapshot => {
  const current = getStudyHealthSnapshot();
  return setTodayFocusedMinutesDev(current.todayFocusedMinutes + deltaMinutes);
};

export const setStudyHealthPercentageDev = (healthPercentage: number): StudyHealthSnapshot => {
  const safeHealthPercentage = clamp(Math.round(healthPercentage), MIN_HEALTH_PERCENTAGE, MAX_HEALTH_PERCENTAGE);
  const targetDailyMinutes = readStoredSurveyTargetMinutes();
  const todayFocusedMinutes = Math.round((targetDailyMinutes * safeHealthPercentage) / 100);

  writeStoredTodayFocusedMinutes(todayFocusedMinutes);
  return getStudyHealthSnapshot();
};

export const adjustStudyHealthPercentageDev = (deltaPercentage: number): StudyHealthSnapshot => {
  const currentHealth = getStudyHealthSnapshot().healthPercentage;
  return setStudyHealthPercentageDev(currentHealth + deltaPercentage);
};

export const adjustStudyTargetMinutesDev = (deltaMinutes: number): StudyHealthSnapshot => {
  const current = getStudyHealthSnapshot();
  return setStudyTargetMinutesDev(current.targetDailyMinutes + deltaMinutes);
};
