import { useEffect, useMemo, useState } from 'react';
import type { StudySurveyInput } from '../types';

const STORAGE_KEY = 'myslime.focusSurvey.v1';

type StoredSurveyState = {
  draft: StudySurveyInput;
  applied: StudySurveyInput;
};

const DEFAULT_SURVEY: StudySurveyInput = {
  studyStyle: 'balanced',
  availableMinutesPerDay: 180,
  preferredSessionIntensity: 3,
  distractionLevel: 'medium',
};

const clampMinutes = (value: number) => Math.min(720, Math.max(30, value));

const sanitizeSurvey = (value: unknown): StudySurveyInput | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<StudySurveyInput>;

  if (candidate.studyStyle !== 'deep_focus' && candidate.studyStyle !== 'balanced' && candidate.studyStyle !== 'sprint') {
    return null;
  }

  if (candidate.distractionLevel !== 'low' && candidate.distractionLevel !== 'medium' && candidate.distractionLevel !== 'high') {
    return null;
  }

  if (typeof candidate.availableMinutesPerDay !== 'number') {
    return null;
  }

  if (
    candidate.preferredSessionIntensity !== 1 &&
    candidate.preferredSessionIntensity !== 2 &&
    candidate.preferredSessionIntensity !== 3 &&
    candidate.preferredSessionIntensity !== 4 &&
    candidate.preferredSessionIntensity !== 5
  ) {
    return null;
  }

  return {
    studyStyle: candidate.studyStyle,
    availableMinutesPerDay: clampMinutes(Math.round(candidate.availableMinutesPerDay)),
    preferredSessionIntensity: candidate.preferredSessionIntensity,
    distractionLevel: candidate.distractionLevel,
  };
};

const readInitialState = (): StoredSurveyState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { draft: DEFAULT_SURVEY, applied: DEFAULT_SURVEY };
    }

    const parsed = JSON.parse(raw) as Partial<StoredSurveyState>;
    const safeDraft = sanitizeSurvey(parsed.draft);
    const safeApplied = sanitizeSurvey(parsed.applied);

    if (!safeDraft || !safeApplied) {
      return { draft: DEFAULT_SURVEY, applied: DEFAULT_SURVEY };
    }

    return {
      draft: safeDraft,
      applied: safeApplied,
    };
  } catch {
    return { draft: DEFAULT_SURVEY, applied: DEFAULT_SURVEY };
  }
};

const areSurveysEqual = (a: StudySurveyInput, b: StudySurveyInput) => {
  return (
    a.studyStyle === b.studyStyle &&
    a.availableMinutesPerDay === b.availableMinutesPerDay &&
    a.preferredSessionIntensity === b.preferredSessionIntensity &&
    a.distractionLevel === b.distractionLevel
  );
};

export const useStudySurvey = () => {
  const [state, setState] = useState<StoredSurveyState>(() => readInitialState());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateDraft = (update: Partial<StudySurveyInput>) => {
    setState((currentState) => ({
      draft: {
        ...currentState.draft,
        ...update,
      },
      applied: {
        ...currentState.draft,
        ...update,
      },
    }));
  };

  const applyDraft = () => {
    setState((currentState) => ({
      ...currentState,
      applied: currentState.draft,
    }));
  };

  const resetDraft = () => {
    setState((currentState) => ({
      ...currentState,
      draft: currentState.applied,
    }));
  };

  const hasPendingChanges = useMemo(() => !areSurveysEqual(state.draft, state.applied), [state]);

  return {
    draftSurvey: state.draft,
    appliedSurvey: state.applied,
    hasPendingChanges,
    updateDraft,
    applyDraft,
    resetDraft,
  };
};
