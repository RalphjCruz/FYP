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

  return (
    <div className="activity-section" aria-label="Developer panel">
      <div className="section-header">
        <h3>Developer Panel</h3>
      </div>

      <div className="tasks-create-card">
        <p className="focus-roadmap-note">Timezone: {timezoneIana}</p>
        <p className="focus-roadmap-note">Actual local day: {actualNow.toLocaleDateString()}</p>
        <p className="focus-roadmap-note">Actual local time: {actualNow.toLocaleTimeString()}</p>
        <p className="focus-roadmap-note">Simulated day offset: {simulatedDayOffset >= 0 ? '+' : ''}{simulatedDayOffset}</p>
        <p className="focus-roadmap-note">Use day settlement buttons to test end-of-day HP changes.</p>
        <p className="focus-roadmap-note">HP updates after day settlement (next day).</p>
      </div>

      <div className="tasks-toolbar">
        <div className="tasks-filter-group">
          <button
            type="button"
            className="tasks-filter-button"
            onClick={handleSetDayToday}
            disabled={loading}
          >
            Day Today
          </button>
          <button
            type="button"
            className="tasks-filter-button"
            onClick={handleStepForwardOneDay}
            disabled={loading}
          >
            Day +1
          </button>
          <button
            type="button"
            className="tasks-filter-button"
            onClick={handleStepForwardTwoDays}
            disabled={loading}
          >
            Day +2
          </button>
          <button
            type="button"
            className="tasks-filter-button"
            onClick={handleStepBackOneDay}
            disabled={loading}
          >
            Day -1
          </button>
          <button
            type="button"
            className="tasks-filter-button"
            onClick={() => void handleResetXpAndFocus()}
            disabled={loading}
          >
            Reset XP + Focus
          </button>
        </div>
      </div>

      {notice && (
        <div className="tasks-create-card">
          <p className="focus-roadmap-note">{notice}</p>
        </div>
      )}

      {error && (
        <div className="tasks-empty-state">
          <p>{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="tasks-create-card">
          <p className="focus-roadmap-note">Simulated UTC: {new Date(lastResult.simulatedNowUtc).toUTCString()}</p>
          <p className="focus-roadmap-note">Current HP: {lastResult.currentHp}/{lastResult.maxHp}</p>
          <p className="focus-roadmap-note">HP carry: {(lastResult.hpDeltaCarry ?? 0).toFixed(3)}</p>
          <p className="focus-roadmap-note">Day streak: {lastResult.dayStreak}</p>
          <p className="focus-roadmap-note">Daily goal: {formatDurationFromMinutes(lastResult.dailyGoalMinutes)}</p>
          <p className="focus-roadmap-note">Today focused: {formatDurationFromMinutes(lastResult.todayFocusedMinutes)}</p>
          <p className="focus-roadmap-note">Last settled local day: {lastResult.lastSettledOnLocal}</p>
        </div>
      )}
    </div>
  );
};
