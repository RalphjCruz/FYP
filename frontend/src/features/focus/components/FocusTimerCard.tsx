import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusCameraMonitor, useFocusSessionSync, useFocusTimer, useStudySurvey } from '../hooks';
import type { FocusSessionCompleteEvent } from '../types';
import { calculateFocusPlanFromSurvey } from '../utils';
import { StudySurveyForm } from './StudySurveyForm';

const DISTRACTION_WARNING_MESSAGE =
  'You left the focus window, so this session ended and progress was not saved.';
const CAMERA_UNFOCUSED_TIMEOUT_MESSAGE = 'Return to study. Session ended because you were unfocused for 10 seconds.';
const CAMERA_UNFOCUSED_WARNING_TEMPLATE = 'Return to study or session will end in';
const AWAY_GRACE_PERIOD_MS = 3_000;
const AWAY_COUNTDOWN_MS = 10_000;
const AWAY_TRACK_INTERVAL_MS = 200;
const GRACE_TRACKED_STATES = new Set(['away', 'using_phone']);

type FocusTimerCardProps = {
  token: string;
  slimeName?: string;
  slimeBodyGradient?: string;
  slimeBodyImageSrc?: string;
  isDevToolsEnabled?: boolean;
  onSessionLockChange?: (isLocked: boolean) => void;
  systemWarningMessage?: string | null;
  onClearSystemWarning?: () => void;
  onStudyHealthSync?: () => Promise<void> | void;
};

type FocusMode = 'regular' | 'intense';

export const FocusTimerCard = ({
  token,
  slimeName = 'My Slime',
  slimeBodyGradient,
  slimeBodyImageSrc,
  isDevToolsEnabled = false,
  onSessionLockChange,
  systemWarningMessage,
  onClearSystemWarning,
  onStudyHealthSync,
}: FocusTimerCardProps) => {
  const [lastCompletion, setLastCompletion] = useState<FocusSessionCompleteEvent | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<FocusMode | null>(null);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [cameraCountdownSeconds, setCameraCountdownSeconds] = useState<number | null>(null);
  const isRunningRef = useRef(false);
  const distractionHandledRef = useRef(false);
  const startGraceUntilRef = useRef(0);
  const sessionLockChangeRef = useRef(onSessionLockChange);
  const cameraCountdownDeadlineRef = useRef<number | null>(null);
  const cameraCountdownIntervalRef = useRef<number | null>(null);
  const awayStartedAtMsRef = useRef<number | null>(null);
  const awayTrackerIntervalRef = useRef<number | null>(null);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    sessionLockChangeRef.current = onSessionLockChange;
  }, [onSessionLockChange]);

  const { draftSurvey, appliedSurvey, updateDraft } = useStudySurvey();
  const personalizedPlan = useMemo(() => calculateFocusPlanFromSurvey(appliedSurvey), [appliedSurvey]);
  const { beginSessionDraft, syncCompletedSession } = useFocusSessionSync({
    token,
    appliedSurvey,
    onStudyHealthSync,
    onWarningMessage: setWarningMessage,
  });

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
    completeMinuteDev,
    discardSession,
  } = useFocusTimer({
      initialFocusMinutes: personalizedPlan.focusMinutes,
      onSessionComplete: (event) => {
        setLastCompletion(event);
        void syncCompletedSession();
      },
    });

  const {
    videoRef,
    isEnabled: isCameraEnabled,
    setIsEnabled: setCameraEnabled,
    state: cameraState,
    lastResult: cameraLastResult,
    errorMessage: cameraErrorMessage,
    monitorServiceUrl,
  } = useFocusCameraMonitor({ isRunning });
  const stableCameraDetectionState = cameraLastResult?.state;
  const effectiveCameraDetectionState =
    stableCameraDetectionState
    ?? (cameraState === 'away' || cameraState === 'looking_down' || cameraState === 'using_phone' ? cameraState : null);
  const effectiveCameraDetectionStateRef = useRef<typeof effectiveCameraDetectionState>(null);
  const showCameraPanel = isRunning && selectedMode === 'intense';
  const requiresCamera = selectedMode === 'intense';
  const canStartSession = selectedMode !== null && (!requiresCamera || isCameraEnabled);
  const sequenceStepMessage =
    selectedMode === null
      ? 'Step 1: choose session mode.'
      : requiresCamera && !isCameraEnabled
        ? 'Step 2: enable camera for Intense Mode.'
        : 'Ready: start your session.';

  useEffect(() => {
    if (isRunning) {
      return;
    }

    const targetDurationMs = personalizedPlan.focusMinutes * 60 * 1000;
    if (totalMs !== targetDurationMs) {
      updateDurationMinutes(personalizedPlan.focusMinutes);
    }
  }, [isRunning, personalizedPlan.focusMinutes, totalMs, updateDurationMinutes]);

  const activeSessionTargetMinutes = Math.ceil(totalMs / 60000);

  const circleRadius = 102;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const safeProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circleCircumference * (1 - safeProgress / 100);
  const bannerMessage = warningMessage ?? systemWarningMessage ?? cameraErrorMessage ?? null;
  const bannerTitle = warningMessage
    ? 'Session interrupted'
    : systemWarningMessage
      ? 'Focus session locked'
      : 'Camera monitor error';

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      distractionHandledRef.current = false;
    }
  }, [isRunning]);

  useEffect(() => {
    if (wasRunningRef.current && !isRunning && isCameraEnabled) {
      setCameraEnabled(false);
    }

    wasRunningRef.current = isRunning;
  }, [isCameraEnabled, isRunning, setCameraEnabled]);

  useEffect(() => {
    sessionLockChangeRef.current?.(isRunning);
  }, [isRunning]);

  useEffect(() => {
    effectiveCameraDetectionStateRef.current = effectiveCameraDetectionState;
  }, [effectiveCameraDetectionState]);

  const clearCameraCountdownTimers = useCallback(() => {
    if (cameraCountdownIntervalRef.current !== null) {
      window.clearInterval(cameraCountdownIntervalRef.current);
      cameraCountdownIntervalRef.current = null;
    }
    cameraCountdownDeadlineRef.current = null;
  }, []);

  const clearCameraCountdown = useCallback(() => {
    clearCameraCountdownTimers();
    setCameraCountdownSeconds(null);
  }, [clearCameraCountdownTimers]);

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

  const startAwayCountdown = useCallback(() => {
    if (cameraCountdownIntervalRef.current !== null || cameraCountdownDeadlineRef.current !== null) {
      return;
    }

    cameraCountdownDeadlineRef.current = Date.now() + AWAY_COUNTDOWN_MS;
    setCameraCountdownSeconds(10);

    cameraCountdownIntervalRef.current = window.setInterval(() => {
      const deadline = cameraCountdownDeadlineRef.current;
      if (!deadline) {
        clearCameraCountdown();
        return;
      }

      const remainingMs = deadline - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setCameraCountdownSeconds(remainingSeconds);

      if (remainingMs <= 0) {
        clearCameraCountdown();
        handleSessionInterrupted(CAMERA_UNFOCUSED_TIMEOUT_MESSAGE);
      }
    }, 250);
  }, [clearCameraCountdown, handleSessionInterrupted]);

  useEffect(() => {
    if (!isRunning || selectedMode !== 'intense') {
      clearCameraCountdownTimers();
      awayStartedAtMsRef.current = null;
      if (awayTrackerIntervalRef.current !== null) {
        window.clearInterval(awayTrackerIntervalRef.current);
        awayTrackerIntervalRef.current = null;
      }
      return;
    }

    if (awayTrackerIntervalRef.current === null) {
      awayTrackerIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const shouldTrackWithGrace = effectiveCameraDetectionStateRef.current !== null
          && GRACE_TRACKED_STATES.has(effectiveCameraDetectionStateRef.current);

        if (shouldTrackWithGrace) {
          if (awayStartedAtMsRef.current === null) {
            awayStartedAtMsRef.current = now;
          }

          const awayDurationMs = now - awayStartedAtMsRef.current;
          if (awayDurationMs >= AWAY_GRACE_PERIOD_MS) {
            startAwayCountdown();
          }
          return;
        }

        awayStartedAtMsRef.current = null;
        clearCameraCountdown();
      }, AWAY_TRACK_INTERVAL_MS);
    }

    return () => {
      if (awayTrackerIntervalRef.current !== null) {
        window.clearInterval(awayTrackerIntervalRef.current);
        awayTrackerIntervalRef.current = null;
      }
    };
  }, [clearCameraCountdown, clearCameraCountdownTimers, isRunning, selectedMode, startAwayCountdown]);

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
      clearCameraCountdownTimers();
      sessionLockChangeRef.current?.(false);
      if (isRunningRef.current) {
        discardSession();
      }
    };
  }, [clearCameraCountdownTimers, discardSession]);

  const handleOpenStartSequence = () => {
    if (isRunning) {
      return;
    }

    setSelectedMode(null);
    setIsModeModalOpen(true);
  };

  const handleCloseStartSequence = useCallback(() => {
    setIsModeModalOpen(false);
    setSelectedMode(null);
    clearCameraCountdown();
    setCameraEnabled(false);
  }, [clearCameraCountdown, setCameraEnabled]);

  const handleConfirmStartSession = () => {
    if (isRunning || !canStartSession) {
      return;
    }

    void (async () => {
      const draftStarted = await beginSessionDraft();
      if (!draftStarted) {
        return;
      }

      startGraceUntilRef.current = Date.now() + 900;
      onClearSystemWarning?.();
      setWarningMessage(null);
      clearCameraCountdown();
      setIsModeModalOpen(false);
      start();
    })();
  };

  return (
    <>
    {isRunning && <div className="focus-session-backdrop" aria-hidden="true"></div>}
    <section className={`focus-card focus-page-card ${isRunning ? 'session-popup-mode' : ''}`} aria-label="Focus timer">
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

      {isRunning && selectedMode === 'intense' && cameraCountdownSeconds !== null && (
        <div className="focus-warning-bubble" role="status">
          {CAMERA_UNFOCUSED_WARNING_TEMPLATE} {cameraCountdownSeconds}s.
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
        <p className="focus-mode-status">
          Session target: {activeSessionTargetMinutes} min for {slimeName}
          {selectedMode ? ` | Mode: ${selectedMode === 'intense' ? 'Intense' : 'Regular'}` : ''}
        </p>
      </div>

      <div className="focus-actions">
        <button type="button" className="btn-cta" onClick={handleOpenStartSequence} disabled={isRunning}>
          {isRunning ? "Can't pause until timer ends" : 'Start Session'}
        </button>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => {
            setWarningMessage(null);
            clearCameraCountdown();
            reset();
          }}
        >
          Reset
        </button>
        {isDevToolsEnabled && isRunning && (
          <button type="button" className="btn-small focus-dev-plus-minute" onClick={completeMinuteDev}>
            +1 Min Completed (Dev)
          </button>
        )}
      </div>

      {isModeModalOpen && !isRunning && (
        <div className="focus-mode-modal-backdrop" onClick={handleCloseStartSequence}>
          <div
            className="focus-mode-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose focus mode"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="focus-mode-select-title">Choose Session Mode</p>
            <p className="focus-mode-select-subtitle">Select mode, then start the timer.</p>
            <div className="focus-mode-select-actions">
              <button
                type="button"
                className={`focus-mode-btn ${selectedMode === 'regular' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedMode('regular');
                  setCameraEnabled(false);
                }}
              >
                Regular Study
              </button>
              <button
                type="button"
                className={`focus-mode-btn ${selectedMode === 'intense' ? 'active' : ''}`}
                onClick={() => setSelectedMode('intense')}
              >
                Intense Mode (Camera)
              </button>
            </div>
            <p className="focus-mode-sequence-note">{sequenceStepMessage}</p>
            {requiresCamera && !isCameraEnabled && (
              <button
                type="button"
                className="btn-refresh focus-mode-camera-cta"
                onClick={() => setCameraEnabled(true)}
              >
                Enable Camera
              </button>
            )}
            {requiresCamera && isCameraEnabled && (
              <p className="focus-mode-sequence-note">Camera is enabled. Confirm preview before starting.</p>
            )}
            {requiresCamera && (
              <div className={`focus-mode-camera-preview ${isCameraEnabled ? 'visible' : ''}`}>
                <video ref={videoRef} className={`focus-camera-preview ${isCameraEnabled ? 'visible' : ''}`} muted playsInline />
                {!isCameraEnabled && <p className="focus-mode-camera-preview-note">Enable camera to preview before starting.</p>}
                {cameraErrorMessage && <p className="focus-mode-camera-preview-note error">{cameraErrorMessage}</p>}
              </div>
            )}
            <div className="focus-mode-modal-actions">
              <button type="button" className="btn-refresh" onClick={handleCloseStartSequence}>
                Cancel
              </button>
              <button type="button" className="btn-cta" onClick={handleConfirmStartSession} disabled={!canStartSession}>
                {selectedMode === 'intense' ? 'Start Intense Timer' : 'Start Timer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraPanel && (
      <div className="focus-camera-panel">
        <div className="focus-camera-header">
          <p className="focus-camera-title">Camera Monitor (Intense Mode)</p>
          <button
            type="button"
            className="btn-refresh"
            onClick={() => setCameraEnabled((current) => !current)}
            disabled={isRunning}
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
        </div>
      </div>
      )}

      <div className="focus-personalization-note">
        <p className="focus-personalization-title">Current profile recommendation</p>
        <p>Active session target: {activeSessionTargetMinutes} min</p>
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
    </>
  );
};
