import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { StudyHealth } from '../../slime/types';
import type { DistractionLevel, StudyStyle } from '../types';

type CompleteFocusSessionInput = {
  durationMinutes: number;
  completedAtUtc?: string;
  timezoneIana?: string;
};

type UpdateFocusProfileInput = {
  targetDailyMinutes: number;
  studyStyle: StudyStyle;
  preferredSessionIntensity: 1 | 2 | 3 | 4 | 5;
  distractionLevel: DistractionLevel;
  timezoneIana?: string;
};

type SimulateSettlementInput = {
  dayOffset: number;
  timezoneIana?: string;
};

export type SimulatedSettlementResult = StudyHealth & {
  simulatedNowUtc: string;
  dayOffset: number;
};

const assertSuccessfulResponse = <T>(response: Response, payload: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }

  if (!payload.data) {
    throw new Error(payload.message || `${fallbackMessage}: missing response data`);
  }

  return payload.data;
};

export const completeFocusSession = async (token: string, input: CompleteFocusSessionInput): Promise<StudyHealth> => {
  const response = await fetch(`${env.apiBaseUrl}/api/focus/sessions/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as ApiResponse<StudyHealth>;
  return assertSuccessfulResponse(response, payload, 'Failed to record focus session');
};

export const updateFocusProfile = async (token: string, input: UpdateFocusProfileInput): Promise<StudyHealth> => {
  const response = await fetch(`${env.apiBaseUrl}/api/focus/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as ApiResponse<StudyHealth>;
  return assertSuccessfulResponse(response, payload, 'Failed to update focus profile');
};

export const simulateFocusSettlementDev = async (
  token: string,
  input: SimulateSettlementInput,
): Promise<SimulatedSettlementResult> => {
  const response = await fetch(`${env.apiBaseUrl}/api/focus/dev/settle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as ApiResponse<SimulatedSettlementResult>;
  return assertSuccessfulResponse(response, payload, 'Failed to simulate day settlement');
};

export const resetFocusProgressDev = async (token: string): Promise<StudyHealth> => {
  const response = await fetch(`${env.apiBaseUrl}/api/focus/dev/reset-progress`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<StudyHealth>;
  return assertSuccessfulResponse(response, payload, 'Failed to reset focus progress');
};
