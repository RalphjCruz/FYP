import { useCallback } from 'react';
import { resetFocusProgressDev, simulateFocusSettlementDev, type SimulatedSettlementResult } from '../../focus/api';
import { resetSlimeXpDev } from '../api';

type UseStudyHealthDevActionsOptions = {
  token: string;
  timezoneIana: string;
  onAfterSettle?: () => Promise<void> | void;
};

export const useStudyHealthDevActions = ({
  token,
  timezoneIana,
  onAfterSettle,
}: UseStudyHealthDevActionsOptions) => {
  const runSettlement = useCallback(
    async (dayOffset: number): Promise<SimulatedSettlementResult> => {
      const result = await simulateFocusSettlementDev(token, { dayOffset, timezoneIana });
      await onAfterSettle?.();
      return result;
    },
    [onAfterSettle, token, timezoneIana],
  );

  const resetXpAndFocus = useCallback(async (): Promise<SimulatedSettlementResult> => {
    await resetSlimeXpDev(token);
    await resetFocusProgressDev(token);
    const result = await simulateFocusSettlementDev(token, { dayOffset: 0, timezoneIana });
    await onAfterSettle?.();
    return result;
  }, [onAfterSettle, token, timezoneIana]);

  return {
    runSettlement,
    resetXpAndFocus,
  };
};
