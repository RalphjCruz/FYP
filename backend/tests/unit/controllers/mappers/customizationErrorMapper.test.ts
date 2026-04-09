import {
  getCustomizationErrorMessage,
  mapClaimDailyCoinsErrorStatus,
  mapEquipCustomizationErrorStatus,
  mapUnlockCustomizationErrorStatus,
} from '../../../../src/controllers/mappers/customizationErrorMapper.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-CEM-001 getCustomizationErrorMessage', () => {
  it('returns Error.message when provided error is an Error instance', () => {
    expect(getCustomizationErrorMessage(new Error('customization failed'), 'fallback')).toBe('customization failed');
  });
});

describe('TC-CEM-002 getCustomizationErrorMessage', () => {
  it('returns fallback message when provided error is not an Error instance', () => {
    expect(getCustomizationErrorMessage('failed', 'fallback')).toBe('fallback');
  });
});

describe('TC-CEM-003 mapClaimDailyCoinsErrorStatus', () => {
  it('returns 409 when message indicates daily coins already claimed', () => {
    expect(mapClaimDailyCoinsErrorStatus('daily reward already claimed today')).toBe(409);
  });
});

describe('TC-CEM-004 mapClaimDailyCoinsErrorStatus', () => {
  it('returns 400 when message does not indicate already-claimed condition', () => {
    expect(mapClaimDailyCoinsErrorStatus('invalid claim state')).toBe(400);
  });
});

describe('TC-CEM-005 unlock/equip error mapping', () => {
  it('maps unlock error statuses for not-enough-coins and generic not-found cases', () => {
    expect(mapUnlockCustomizationErrorStatus('Not enough coins to unlock item')).toBe(400);
    expect(mapUnlockCustomizationErrorStatus('item not found')).toBe(404);
  });
});

describe('TC-CEM-006 unlock/equip error mapping', () => {
  it('maps equip error statuses for unlock-required and generic not-found cases', () => {
    expect(mapEquipCustomizationErrorStatus('Please unlock item first')).toBe(400);
    expect(mapEquipCustomizationErrorStatus('item not found')).toBe(404);
  });
});
