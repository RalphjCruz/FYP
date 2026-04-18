import type { FocusTimerPlan, StudySurveyInput } from '../types';

const MIN_FOCUS_MINUTES = 5;
const MAX_FOCUS_MINUTES = 180;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const calculateFocusPlanFromSurvey = (survey: StudySurveyInput): FocusTimerPlan => {
  const suggestedFocusMinutes = clamp(Math.round(survey.availableMinutesPerDay), MIN_FOCUS_MINUTES, MAX_FOCUS_MINUTES);

  return {
    focusMinutes: suggestedFocusMinutes,
    recommendedSessionsPerDay: 1,
    rationale: ['Session length is set directly from the minutes slider.'],
    futureBreakLogicNote: 'Break cadence remains deferred.',
  };
};
