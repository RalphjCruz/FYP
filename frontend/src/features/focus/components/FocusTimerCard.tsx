import { useEffect, useMemo, useState } from 'react';
import { useFocusTimer, useStudySurvey } from '../hooks';
import type { FocusSessionCompleteEvent } from '../types';
import { calculateFocusPlanFromSurvey } from '../utils';
import { StudySurveyForm } from './StudySurveyForm';

export const FocusTimerCard = () => {
  const [lastCompletion, setLastCompletion] = useState<FocusSessionCompleteEvent | null>(null);
  const { draftSurvey, appliedSurvey, updateDraft } = useStudySurvey();
  const personalizedPlan = useMemo(() => calculateFocusPlanFromSurvey(appliedSurvey), [appliedSurvey]);

  const {
    isRunning,
    totalMs,
    progress,
    formattedTime,
    completedSessions,
    totalFocusedMinutes,
    updateDurationMinutes,
    start,
    pause,
    reset,
  } = useFocusTimer({
      initialFocusMinutes: personalizedPlan.focusMinutes,
      onSessionComplete: (event) => {
        setLastCompletion(event);
      },
    });

  useEffect(() => {
    const targetDurationMs = personalizedPlan.focusMinutes * 60 * 1000;
    if (totalMs !== targetDurationMs) {
      updateDurationMinutes(personalizedPlan.focusMinutes);
    }
  }, [personalizedPlan.focusMinutes, totalMs, updateDurationMinutes]);

  const circleRadius = 102;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const safeProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circleCircumference * (1 - safeProgress / 100);

  return (
    <section className="focus-card" aria-label="Focus timer">
      <div className="focus-header">
        <div>
          <h3 className="focus-title">Focus Timer</h3>
          <p className="focus-subtitle">Single-session focus mode. Break logic comes in the next iteration.</p>
        </div>
        <span className="focus-session-count">Completed: {completedSessions}</span>
      </div>

      <div className="focus-wheel-wrapper">
        <svg className="focus-wheel" viewBox="0 0 240 240" role="img" aria-label="Focus session progress">
          <circle className="focus-wheel-track" cx="120" cy="120" r={circleRadius}></circle>
          <circle
            className="focus-wheel-progress"
            cx="120"
            cy="120"
            r={circleRadius}
            strokeDasharray={circleCircumference}
            strokeDashoffset={strokeDashoffset}
          ></circle>
        </svg>

        <div className="focus-wheel-center">
          <div className="focus-time">{formattedTime}</div>
          <p className="focus-mode-status">Session target: {personalizedPlan.focusMinutes} min</p>
        </div>
      </div>

      <div className="focus-actions">
        <button className="btn-cta" onClick={isRunning ? pause : start}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="btn-refresh" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="focus-personalization-note">
        <p className="focus-personalization-title">Current profile recommendation</p>
        <p>Active session target: {personalizedPlan.focusMinutes} min</p>
        <p>Recommended sessions/day: {personalizedPlan.recommendedSessionsPerDay}</p>
        <p>{personalizedPlan.futureBreakLogicNote}</p>
      </div>

      <StudySurveyForm draftSurvey={draftSurvey} onUpdateDraft={updateDraft} />

      {lastCompletion && (
        <p className="focus-completion-note">
          Nice work. Total focused minutes so far: {lastCompletion.totalFocusedMinutes}.
        </p>
      )}

      <p className="focus-roadmap-note">Planner logic lives in `features/focus/utils/focusPlanner.ts` for survey expansion.</p>
      <p className="focus-roadmap-note">Current tracked focus minutes: {totalFocusedMinutes}</p>
    </section>
  );
};
