import { useEffect, useState } from 'react';
import type { StudySurveyInput } from '../types';

const STORAGE_KEY = 'myslime.focusSurvey.v1';

type StoredSurveyState = {
  survey?: unknown;
  draft?: unknown;
  applied?: unknown;
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

const readInitialState = (): StudySurveyInput => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SURVEY;
    }

    const parsed = JSON.parse(raw) as Partial<StoredSurveyState>;
    const safeSurvey = sanitizeSurvey(parsed.survey ?? parsed.applied ?? parsed.draft);

    if (!safeSurvey) {
      return DEFAULT_SURVEY;
    }

    return safeSurvey;
  } catch {
    return DEFAULT_SURVEY;
  }
};

export const useStudySurvey = () => {
  const [survey, setSurvey] = useState<StudySurveyInput>(() => readInitialState());

  useEffect(() => {
    // Keep legacy keys so existing local data remains readable across versions.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ survey, draft: survey, applied: survey }));
  }, [survey]);

  const updateDraft = (update: Partial<StudySurveyInput>) => {
    setSurvey((currentSurvey) => ({
      ...currentSurvey,
      ...update,
    }));
  };

  return {
    draftSurvey: survey,
    appliedSurvey: survey,
    updateDraft,
  };
};
