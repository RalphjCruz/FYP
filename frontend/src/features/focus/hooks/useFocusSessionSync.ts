import { useCallback, useEffect, useRef } from 'react';
import { completeFocusSession, updateFocusProfile } from '../api';
import type { FocusSessionCompleteEvent, StudySurveyInput } from '../types';
import { getSimulatedDayOffset, getSimulatedNowUtcIso } from '../../../shared/dev/simulatedDay';

type UseFocusSessionSyncOptions = {
  token: string;
  appliedSurvey: StudySurveyInput;
  onStudyHealthSync?: () => Promise<void> | void;
  onWarningMessage?: (message: string) => void;
};

const getClientTimezoneIana = () => {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolved && typeof resolved === 'string' ? resolved : 'UTC';
};

export const useFocusSessionSync = ({
  token,
  appliedSurvey,
  onStudyHealthSync,
  onWarningMessage,
}: UseFocusSessionSyncOptions) => {
  const profileSyncKeyRef = useRef('');

  const syncCompletedSession = useCallback(
    async (event: FocusSessionCompleteEvent) => {
      const simulatedDayOffset = getSimulatedDayOffset();
      const payload = {
        durationMinutes: Math.max(1, Math.round(event.completedDurationMinutes)),
        timezoneIana: getClientTimezoneIana(),
        completedAtUtc: simulatedDayOffset === 0 ? undefined : getSimulatedNowUtcIso(),
      };

      try {
        await completeFocusSession(token, payload);
        await onStudyHealthSync?.();
      } catch (error) {
        onWarningMessage?.(
          error instanceof Error ? error.message : 'Failed to record completed focus session.',
        );
      }
    },
    [onStudyHealthSync, onWarningMessage, token],
  );

  useEffect(() => {
    const payload = {
      targetDailyMinutes: appliedSurvey.availableMinutesPerDay,
      studyStyle: appliedSurvey.studyStyle,
      preferredSessionIntensity: appliedSurvey.preferredSessionIntensity,
      distractionLevel: appliedSurvey.distractionLevel,
      timezoneIana: getClientTimezoneIana(),
    };

    const nextKey = JSON.stringify(payload);
    if (profileSyncKeyRef.current === nextKey) {
      return;
    }

    profileSyncKeyRef.current = nextKey;

    let cancelled = false;
    void (async () => {
      try {
        await updateFocusProfile(token, payload);
        if (!cancelled) {
          await onStudyHealthSync?.();
        }
      } catch (error) {
        if (!cancelled) {
          onWarningMessage?.(error instanceof Error ? error.message : 'Failed to update focus profile.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    appliedSurvey.availableMinutesPerDay,
    appliedSurvey.distractionLevel,
    appliedSurvey.preferredSessionIntensity,
    appliedSurvey.studyStyle,
    onStudyHealthSync,
    onWarningMessage,
    token,
  ]);

  return {
    syncCompletedSession,
  };
};
