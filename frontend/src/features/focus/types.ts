export type StudyStyle = 'deep_focus' | 'balanced' | 'sprint';

export type DistractionLevel = 'low' | 'medium' | 'high';

export type StudySurveyInput = {
  studyStyle: StudyStyle;
  availableMinutesPerDay: number;
  preferredSessionIntensity: 1 | 2 | 3 | 4 | 5;
  distractionLevel: DistractionLevel;
};

export type FocusTimerPlan = {
  focusMinutes: number;
  recommendedSessionsPerDay: number;
  rationale: string[];
  futureBreakLogicNote: string;
};

export type FocusSessionCompleteEvent = {
  completedSessions: number;
  totalFocusedMinutes: number;
};
