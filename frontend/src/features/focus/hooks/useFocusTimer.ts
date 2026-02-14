import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FocusSessionCompleteEvent } from '../types';

const STORAGE_KEY = 'myslime.focusTimer.v3';
const SECOND_MS = 1000;

type TimerState = {
  durationMs: number;
  isRunning: boolean;
  remainingMs: number;
  endAtMs: number | null;
  completedSessions: number;
  totalFocusedMs: number;
};

type UseFocusTimerOptions = {
  initialFocusMinutes: number;
  onSessionComplete?: (event: FocusSessionCompleteEvent) => void;
};

const clampDurationMinutes = (focusMinutes: number) => Math.max(1, Math.round(focusMinutes));

const getDefaultState = (durationMs: number): TimerState => ({
  durationMs,
  isRunning: false,
  remainingMs: durationMs,
  endAtMs: null,
  completedSessions: 0,
  totalFocusedMs: 0,
});

const getSafeState = (parsed: unknown): TimerState | null => {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const state = parsed as Partial<TimerState>;

  if (typeof state.durationMs !== 'number' || state.durationMs <= 0) {
    return null;
  }

  if (typeof state.isRunning !== 'boolean') {
    return null;
  }

  if (typeof state.remainingMs !== 'number' || state.remainingMs < 0) {
    return null;
  }

  if (state.endAtMs !== null && typeof state.endAtMs !== 'number') {
    return null;
  }

  if (typeof state.completedSessions !== 'number' || state.completedSessions < 0) {
    return null;
  }

  if (typeof state.totalFocusedMs !== 'number' || state.totalFocusedMs < 0) {
    return null;
  }

  return {
    durationMs: state.durationMs,
    isRunning: state.isRunning,
    remainingMs: state.remainingMs,
    endAtMs: state.endAtMs,
    completedSessions: state.completedSessions,
    totalFocusedMs: state.totalFocusedMs,
  };
};

const readInitialState = (durationMs: number): TimerState => {
  const fallback = getDefaultState(durationMs);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = getSafeState(JSON.parse(raw));
    if (!parsed) {
      return fallback;
    }

    if (parsed.durationMs !== durationMs) {
      return {
        ...parsed,
        durationMs,
        isRunning: false,
        endAtMs: null,
        remainingMs: durationMs,
      };
    }

    const normalizedState: TimerState = {
      ...parsed,
      durationMs,
      remainingMs: Math.min(parsed.remainingMs, durationMs),
    };

    if (!normalizedState.isRunning || normalizedState.endAtMs === null) {
      return normalizedState;
    }

    const recalculatedRemainingMs = Math.max(0, normalizedState.endAtMs - Date.now());

    if (recalculatedRemainingMs === 0) {
      return {
        ...normalizedState,
        isRunning: false,
        endAtMs: null,
        remainingMs: durationMs,
      };
    }

    return {
      ...normalizedState,
      remainingMs: recalculatedRemainingMs,
    };
  } catch {
    return fallback;
  }
};

export const useFocusTimer = ({ initialFocusMinutes, onSessionComplete }: UseFocusTimerOptions) => {
  const initialDurationMs = clampDurationMinutes(initialFocusMinutes) * 60 * SECOND_MS;
  const [timerState, setTimerState] = useState<TimerState>(() => readInitialState(initialDurationMs));
  const completionHandlerRef = useRef(onSessionComplete);

  useEffect(() => {
    completionHandlerRef.current = onSessionComplete;
  }, [onSessionComplete]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  useEffect(() => {
    if (!timerState.isRunning || timerState.endAtMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerState((currentState) => {
        if (!currentState.isRunning || currentState.endAtMs === null) {
          return currentState;
        }

        const nextRemainingMs = Math.max(0, currentState.endAtMs - Date.now());

        if (nextRemainingMs === 0) {
          const nextCompletedSessions = currentState.completedSessions + 1;
          const nextTotalFocusedMs = currentState.totalFocusedMs + currentState.durationMs;

          completionHandlerRef.current?.({
            completedSessions: nextCompletedSessions,
            totalFocusedMinutes: Math.floor(nextTotalFocusedMs / 60000),
          });

          return {
            ...currentState,
            isRunning: false,
            endAtMs: null,
            remainingMs: currentState.durationMs,
            completedSessions: nextCompletedSessions,
            totalFocusedMs: nextTotalFocusedMs,
          };
        }

        if (nextRemainingMs === currentState.remainingMs) {
          return currentState;
        }

        return {
          ...currentState,
          remainingMs: nextRemainingMs,
        };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timerState.isRunning, timerState.endAtMs]);

  const updateDurationMinutes = useCallback((focusMinutes: number) => {
    const nextDurationMs = clampDurationMinutes(focusMinutes) * 60 * SECOND_MS;

    setTimerState((currentState) => ({
      ...currentState,
      durationMs: nextDurationMs,
      isRunning: false,
      endAtMs: null,
      remainingMs: nextDurationMs,
    }));
  }, []);

  const start = useCallback(() => {
    setTimerState((currentState) => {
      if (currentState.isRunning) {
        return currentState;
      }

      return {
        ...currentState,
        isRunning: true,
        endAtMs: Date.now() + currentState.remainingMs,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setTimerState((currentState) => {
      if (!currentState.isRunning || currentState.endAtMs === null) {
        return currentState;
      }

      return {
        ...currentState,
        isRunning: false,
        endAtMs: null,
        remainingMs: Math.max(0, currentState.endAtMs - Date.now()),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setTimerState((currentState) => ({
      ...currentState,
      isRunning: false,
      endAtMs: null,
      remainingMs: currentState.durationMs,
    }));
  }, []);

  const progress =
    timerState.durationMs === 0 ? 0 : ((timerState.durationMs - timerState.remainingMs) / timerState.durationMs) * 100;

  const formattedTime = useMemo(() => {
    const totalSeconds = Math.ceil(timerState.remainingMs / SECOND_MS);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [timerState.remainingMs]);

  return {
    isRunning: timerState.isRunning,
    remainingMs: timerState.remainingMs,
    totalMs: timerState.durationMs,
    progress,
    completedSessions: timerState.completedSessions,
    totalFocusedMinutes: Math.floor(timerState.totalFocusedMs / 60000),
    formattedTime,
    updateDurationMinutes,
    start,
    pause,
    reset,
  };
};
