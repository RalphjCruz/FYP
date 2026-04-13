import { useCallback, useEffect, useRef } from 'react';
import { completeFocusSession, startFocusSessionDraft, updateFocusProfile } from '../api';
import type { StudySurveyInput } from '../types';

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
  const activeDraftIdRef = useRef<number | null>(null);

  const beginSessionDraft = useCallback(async () => {
    try {
      const draft = await startFocusSessionDraft(token, {
        timezoneIana: getClientTimezoneIana(),
      });
      activeDraftIdRef.current = draft.draftId;
      return true;
    } catch (error) {
      onWarningMessage?.(error instanceof Error ? error.message : 'Failed to start focus session.');
      activeDraftIdRef.current = null;
      return false;
    }
  }, [onWarningMessage, token]);

  const syncCompletedSession = useCallback(
    async () => {
      const activeDraftId = activeDraftIdRef.current;
      if (!activeDraftId) {
        onWarningMessage?.('No active focus draft found. Start a new focus session.');
        return;
      }

      const payload = {
        draftId: activeDraftId,
        timezoneIana: getClientTimezoneIana(),
      };

      try {
        await completeFocusSession(token, payload);
        activeDraftIdRef.current = null;
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
    beginSessionDraft,
    syncCompletedSession,
  };
};
