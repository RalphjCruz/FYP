import { useCallback, useEffect, useMemo, useState } from 'react';
import { type SimulatedSettlementResult } from '../../focus/api';
import { useStudyHealthDevActions } from '../hooks';
import {
  getSimulatedDayOffset,
  setSimulatedDayOffset as persistSimulatedDayOffset,
} from '../../../shared/dev/simulatedDay';

type StudyHealthDevPanelProps = {
  token: string;
  onAfterSettle?: () => Promise<void> | void;
  onSimulationUpdate?: (result: SimulatedSettlementResult, dayOffset: number) => void;
};

const formatDurationFromMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
};

export const StudyHealthDevPanel = ({ token, onAfterSettle, onSimulationUpdate }: StudyHealthDevPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualNow, setActualNow] = useState(() => new Date());
  const [simulatedDayOffset, setSimulatedDayOffset] = useState(() => getSimulatedDayOffset());
  const [lastResult, setLastResult] = useState<SimulatedSettlementResult | null>(null);
  const [resultByOffset, setResultByOffset] = useState<Record<number, SimulatedSettlementResult>>({});

  useEffect(() => {
    const intervalId = window.setInterval(() => setActualNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const timezoneIana = useMemo(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved && typeof resolved === 'string' ? resolved : 'UTC';
  }, []);
  const { runSettlement: runSettlementAction, resetXpAndFocus } = useStudyHealthDevActions({
    token,
    timezoneIana,
  });

  const runSettlement = useCallback(
    async (nextDayOffset: number) => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        if (nextDayOffset < simulatedDayOffset && resultByOffset[nextDayOffset]) {
          const cached = resultByOffset[nextDayOffset];
          setLastResult(cached);
          setSimulatedDayOffset(persistSimulatedDayOffset(nextDayOffset));
          onSimulationUpdate?.(cached, nextDayOffset);
          setNotice(
            `Simulated day ${nextDayOffset >= 0 ? '+' : ''}${nextDayOffset}. HP ${cached.currentHp}/${cached.maxHp}, streak ${cached.dayStreak}.`,
          );
          return;
        }

        const result = await runSettlementAction(nextDayOffset);
        setLastResult(result);
        setSimulatedDayOffset(persistSimulatedDayOffset(nextDayOffset));
        setResultByOffset((previous) => ({ ...previous, [nextDayOffset]: result }));
        onSimulationUpdate?.(result, nextDayOffset);
        await onAfterSettle?.();
        setNotice(
          `Simulated day ${nextDayOffset >= 0 ? '+' : ''}${nextDayOffset}. HP ${result.currentHp}/${result.maxHp}, streak ${result.dayStreak}.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to run day simulation.');
      } finally {
        setLoading(false);
      }
    },
    [onAfterSettle, onSimulationUpdate, resultByOffset, runSettlementAction, simulatedDayOffset],
  );

  const handleSetDayToday = useCallback(() => {
    void runSettlement(0);
  }, [runSettlement]);

  const handleStepForwardOneDay = useCallback(() => {
    void runSettlement(simulatedDayOffset + 1);
  }, [runSettlement, simulatedDayOffset]);

  const handleStepForwardTwoDays = useCallback(() => {
    void runSettlement(simulatedDayOffset + 2);
  }, [runSettlement, simulatedDayOffset]);

  const handleStepBackOneDay = useCallback(() => {
    void runSettlement(simulatedDayOffset - 1);
  }, [runSettlement, simulatedDayOffset]);

  const handleResetXpAndFocus = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const resetResult = await resetXpAndFocus();
      setSimulatedDayOffset(persistSimulatedDayOffset(0));
      setResultByOffset({ 0: resetResult });
      await onAfterSettle?.();
      setLastResult(resetResult);
      onSimulationUpdate?.(resetResult, 0);
      setNotice(`Reset XP, focus, and HP. Current HP ${resetResult.currentHp}/${resetResult.maxHp}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset XP and focus time.');
    } finally {
      setLoading(false);
    }
  }, [onAfterSettle, onSimulationUpdate, resetXpAndFocus]);

  const actionButtonClass = 'rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg';

  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Developer panel">
      <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Developer Panel</h3>

      <div className="mt-4 space-y-2 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4 font-sans text-base text-gb-text sm:text-lg">
        <p>Timezone: {timezoneIana}</p>
        <p>Actual local day: {actualNow.toLocaleDateString()}</p>
        <p>Actual local time: {actualNow.toLocaleTimeString()}</p>
        <p>Simulated day offset: {simulatedDayOffset >= 0 ? '+' : ''}{simulatedDayOffset}</p>
        <p>Use day settlement buttons to test end-of-day HP changes.</p>
        <p>HP updates after day settlement (next day).</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" className={actionButtonClass} onClick={handleSetDayToday} disabled={loading}>
          Day Today
        </button>
        <button type="button" className={actionButtonClass} onClick={handleStepForwardOneDay} disabled={loading}>
          Day +1
        </button>
        <button type="button" className={actionButtonClass} onClick={handleStepForwardTwoDays} disabled={loading}>
          Day +2
        </button>
        <button type="button" className={actionButtonClass} onClick={handleStepBackOneDay} disabled={loading}>
          Day -1
        </button>
        <button type="button" className={actionButtonClass} onClick={() => void handleResetXpAndFocus()} disabled={loading}>
          Reset XP + Focus
        </button>
      </div>

      {notice && (
        <div className="mt-4 rounded-lg border-2 border-[#2f5e2f] bg-[#3b7f3b]/20 p-4">
          <p className="font-sans text-base text-[#153015] sm:text-lg">{notice}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4" role="alert">
          <p className="font-sans text-base text-[#4d1212] sm:text-lg">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="mt-4 space-y-2 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4 font-sans text-base text-gb-text sm:text-lg">
          <p>Simulated UTC: {new Date(lastResult.simulatedNowUtc).toUTCString()}</p>
          <p>Current HP: {lastResult.currentHp}/{lastResult.maxHp}</p>
          <p>HP carry: {(lastResult.hpDeltaCarry ?? 0).toFixed(3)}</p>
          <p>Day streak: {lastResult.dayStreak}</p>
          <p>Daily goal: {formatDurationFromMinutes(lastResult.dailyGoalMinutes)}</p>
          <p>Today focused: {formatDurationFromMinutes(lastResult.todayFocusedMinutes)}</p>
          <p>Last settled local day: {lastResult.lastSettledOnLocal}</p>
        </div>
      )}
    </section>
  );
};
