import type { FocusTimerPlan, StudySurveyInput } from '../types';

const MIN_FOCUS_MINUTES = 15;
const MAX_FOCUS_MINUTES = 90;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const styleBaseMinutes: Record<StudySurveyInput['studyStyle'], number> = {
  deep_focus: 50,
  balanced: 35,
  sprint: 25,
};

const distractionAdjustment: Record<StudySurveyInput['distractionLevel'], number> = {
  low: 10,
  medium: 0,
  high: -10,
};

export const calculateFocusPlanFromSurvey = (survey: StudySurveyInput): FocusTimerPlan => {
  const intensityBonus = (survey.preferredSessionIntensity - 3) * 5;
  const availableTimeFactor = clamp(Math.round(survey.availableMinutesPerDay / 60) * 2, -8, 12);

  const suggestedFocusMinutes = clamp(
    styleBaseMinutes[survey.studyStyle] + distractionAdjustment[survey.distractionLevel] + intensityBonus + availableTimeFactor,
    MIN_FOCUS_MINUTES,
    MAX_FOCUS_MINUTES,
  );

  const recommendedSessionsPerDay = Math.max(1, Math.floor(survey.availableMinutesPerDay / suggestedFocusMinutes));

  return {
    focusMinutes: suggestedFocusMinutes,
    recommendedSessionsPerDay,
    rationale: [
      `Study style '${survey.studyStyle}' sets baseline session length.`,
      `Distraction level '${survey.distractionLevel}' adjusts duration for consistency.`,
      'Intensity and free-time inputs tune the final recommendation.',
    ],
    futureBreakLogicNote:
      'Break cadence is intentionally deferred. Next iteration can inject short/long break logic into this planner output.',
  };
};
