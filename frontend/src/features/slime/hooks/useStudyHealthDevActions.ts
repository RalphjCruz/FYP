import { useCallback } from 'react';
import { resetFocusProgressDev, simulateFocusSettlementDev, type SimulatedSettlementResult } from '../../focus/api';
import { resetSlimeXpDev } from '../api';

type UseStudyHealthDevActionsOptions = {
  token: string;
  timezoneIana: string;
};

export const useStudyHealthDevActions = ({
  token,
  timezoneIana,
}: UseStudyHealthDevActionsOptions) => {
  const runSettlement = useCallback(
    async (dayOffset: number): Promise<SimulatedSettlementResult> => {
      return simulateFocusSettlementDev(token, { dayOffset, timezoneIana });
    },
    [token, timezoneIana],
  );

  const resetXpAndFocus = useCallback(async (): Promise<SimulatedSettlementResult> => {
    await resetSlimeXpDev(token);
    await resetFocusProgressDev(token);
    return simulateFocusSettlementDev(token, { dayOffset: 0, timezoneIana });
  }, [token, timezoneIana]);

  return {
    runSettlement,
    resetXpAndFocus,
  };
};
