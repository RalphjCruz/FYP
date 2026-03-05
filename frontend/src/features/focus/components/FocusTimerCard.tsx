import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusCameraMonitor, useFocusTimer, useStudySurvey } from '../hooks';
import type { FocusSessionCompleteEvent } from '../types';
import { calculateFocusPlanFromSurvey } from '../utils';
import { StudySurveyForm } from './StudySurveyForm';

const DISTRACTION_WARNING_MESSAGE =
  'You left the focus window, so this session ended and progress was not saved.';

type FocusTimerCardProps = {
  slimeName?: string;
  slimeBodyGradient?: string;
  slimeBodyImageSrc?: string;
  onSessionLockChange?: (isLocked: boolean) => void;
  systemWarningMessage?: string | null;
  onClearSystemWarning?: () => void;
};

export const FocusTimerCard = ({
  slimeName = 'My Slime',
  slimeBodyGradient,
  slimeBodyImageSrc,
  onSessionLockChange,
  systemWarningMessage,
  onClearSystemWarning,
}: FocusTimerCardProps) => {
  const [lastCompletion, setLastCompletion] = useState<FocusSessionCompleteEvent | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const isRunningRef = useRef(false);
  const distractionHandledRef = useRef(false);
  const startGraceUntilRef = useRef(0);
  const sessionLockChangeRef = useRef(onSessionLockChange);

  useEffect(() => {
    sessionLockChangeRef.current = onSessionLockChange;
  }, [onSessionLockChange]);

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
    reset,
    discardSession,
  } = useFocusTimer({
      initialFocusMinutes: personalizedPlan.focusMinutes,
      onSessionComplete: (event) => {
        setLastCompletion(event);
      },
    });

  const {
    videoRef,
    isEnabled: isCameraEnabled,
    setIsEnabled: setCameraEnabled,
    state: cameraState,
    lastResult: cameraLastResult,
    errorMessage: cameraErrorMessage,
    monitorWarning,
    monitorServiceUrl,
  } = useFocusCameraMonitor({ isRunning });
  const debugFacePoints = cameraLastResult?.debug?.facePoints ?? [];
  const debugPoints = debugFacePoints;
  const debugDecisionPath = cameraLastResult?.debug?.decisionPath ?? [];
  const debugMetrics = cameraLastResult?.debug?.metrics ?? {};

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
  const bannerMessage = warningMessage ?? systemWarningMessage ?? monitorWarning ?? cameraErrorMessage ?? null;
  const bannerTitle = warningMessage
    ? 'Session interrupted'
    : systemWarningMessage
      ? 'Focus session locked'
      : cameraErrorMessage
        ? 'Camera monitor error'
        : monitorWarning
          ? 'Camera monitor alert'
          : 'Focus alert';

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      distractionHandledRef.current = false;
    }
  }, [isRunning]);

  useEffect(() => {
    sessionLockChangeRef.current?.(isRunning);
  }, [isRunning]);

  const handleSessionInterrupted = useCallback(
    (message: string) => {
      if (!isRunningRef.current || distractionHandledRef.current) {
        return;
      }

      distractionHandledRef.current = true;
      discardSession();
      setWarningMessage(message);

      window.setTimeout(() => {
        window.focus();
      }, 40);
    },
    [discardSession],
  );

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const handleVisibilityChange = () => {
      if (Date.now() < startGraceUntilRef.current) {
        return;
      }

      if (document.hidden) {
        handleSessionInterrupted(DISTRACTION_WARNING_MESSAGE);
      }
    };

    const handleWindowBlur = () => {
      if (Date.now() < startGraceUntilRef.current) {
        return;
      }

      handleSessionInterrupted(DISTRACTION_WARNING_MESSAGE);
    };

    const handleBeforeUnload = () => {
      discardSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [discardSession, handleSessionInterrupted, isRunning]);

  useEffect(() => {
    return () => {
      sessionLockChangeRef.current?.(false);
      if (isRunningRef.current) {
        discardSession();
      }
    };
  }, [discardSession]);

  const handleStartSession = () => {
    if (isRunning) {
      return;
    }

    startGraceUntilRef.current = Date.now() + 900;
    onClearSystemWarning?.();
    setWarningMessage(null);
    start();
  };

  return (
    <section className="focus-card focus-page-card" aria-label="Focus timer">
      <div className="focus-page-header">
        <div>
          <h2 className="focus-title">Focus Session</h2>
          <p className="focus-subtitle">Stay in this screen. Leaving the window ends the session without saving progress.</p>
        </div>
        <span className="focus-session-count">Completed: {completedSessions}</span>
      </div>

      {bannerMessage && (
        <div className="focus-warning-banner" role="status">
          <strong>{bannerTitle}</strong>
          <p>{bannerMessage}</p>
        </div>
      )}

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
          <div className="focus-slime-avatar" aria-hidden="true">
            <div
              className={`focus-slime-body ${slimeBodyImageSrc ? 'image-mode' : ''}`}
              style={
                slimeBodyImageSrc
                  ? {
                      backgroundImage: `url(${slimeBodyImageSrc})`,
                    }
                  : slimeBodyGradient
                    ? { background: slimeBodyGradient }
                    : undefined
              }
            >
              <span className={`focus-slime-eye left ${slimeBodyImageSrc ? 'overlay' : ''}`}></span>
              <span className={`focus-slime-eye right ${slimeBodyImageSrc ? 'overlay' : ''}`}></span>
              <span className={`focus-slime-smile ${slimeBodyImageSrc ? 'overlay' : ''}`}></span>
            </div>
          </div>
        </div>
      </div>

      <div className="focus-time-block">
        <div className="focus-time focus-time-below">{formattedTime}</div>
        <p className="focus-mode-status">Session target: {personalizedPlan.focusMinutes} min for {slimeName}</p>
      </div>

      <div className="focus-actions">
        <button type="button" className="btn-cta" onClick={handleStartSession}>
          {isRunning ? "Can't pause until timer ends" : 'Start Session'}
        </button>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => {
            setWarningMessage(null);
            reset();
          }}
        >
          Reset
        </button>
      </div>

      <div className="focus-camera-panel">
        <div className="focus-camera-header">
          <p className="focus-camera-title">Camera Monitor (MVP)</p>
          <button
            type="button"
            className="btn-refresh"
            onClick={() => setCameraEnabled((current) => !current)}
          >
            {isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}
          </button>
        </div>
        <p className="focus-roadmap-note">
          Service endpoint: {monitorServiceUrl}
        </p>
        <p className="focus-roadmap-note">Tip: enable camera before starting a session so permission prompts do not interrupt focus lock.</p>
        <p className="focus-roadmap-note">
          Status: {cameraState}
          {cameraLastResult ? ` (${Math.round(cameraLastResult.confidence * 100)}% confidence)` : ''}
        </p>
        {cameraLastResult?.reason && (
          <p className="focus-roadmap-note">Detection reason: {cameraLastResult.reason}</p>
        )}
        <div className={`focus-camera-visual ${isCameraEnabled ? 'visible' : ''}`}>
          <video ref={videoRef} className={`focus-camera-preview ${isCameraEnabled ? 'visible' : ''}`} muted playsInline />
          {isCameraEnabled && (
            <div className="focus-camera-overlay" aria-hidden="true">
              {debugPoints.map((point, index) => (
                <div
                  key={`${point.label}-${index}`}
                  className={`focus-camera-point ${point.label.startsWith('hand') ? 'hand' : 'face'}`}
                  style={{
                    left: `${Math.max(0, Math.min(100, point.x * 100))}%`,
                    top: `${Math.max(0, Math.min(100, point.y * 100))}%`,
                  }}
                  title={point.label}
                >
                  <span className="focus-camera-point-label">{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {debugDecisionPath.length > 0 && (
          <div className="focus-camera-debug">
            <p className="focus-camera-debug-title">Camera Decision Path</p>
            <div className="focus-camera-debug-list">
              {debugDecisionPath.map((step, index) => (
                <p key={`${step}-${index}`}>{index + 1}. {step}</p>
              ))}
            </div>
          </div>
        )}
        {Object.keys(debugMetrics).length > 0 && (
          <div className="focus-camera-metrics">
            {Object.entries(debugMetrics).map(([key, value]) => (
              <span key={key}>
                {key}: {typeof value === 'number' ? value.toFixed(3) : String(value)}
              </span>
            ))}
          </div>
        )}
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
