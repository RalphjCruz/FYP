import { useMemo } from 'react';
import { useAnalyticsSummary } from '../hooks';
import type { AnalyticsDailyPoint } from '../types';

type AnalyticsBoardProps = {
  token: string | null;
};

const formatDayLabel = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

const TrendBars = ({ points }: { points: AnalyticsDailyPoint[] }) => {
  const maxValue = useMemo(() => Math.max(1, ...points.map((point) => point.value)), [points]);

  return (
    <div className="analytics-trend-bars">
      {points.map((point) => (
        <div key={point.date} className="analytics-trend-col">
          <div className="analytics-trend-track">
            <div className="analytics-trend-fill" style={{ height: `${(point.value / maxValue) * 100}%` }}></div>
          </div>
          <span className="analytics-trend-value">{point.value}</span>
          <span className="analytics-trend-label">{formatDayLabel(point.date)}</span>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsBoard = ({ token }: AnalyticsBoardProps) => {
  const { summary, loading, error } = useAnalyticsSummary(token);

  return (
    <section className="analytics-board" aria-label="Analytics board">
      <header className="tasks-board-header">
        <div>
          <h3>Analytics</h3>
          <p>Simple performance metrics from your tasks, XP progression, and achievements.</p>
        </div>
      </header>

      {error && (
        <div className="tasks-empty-state">
          <p>{error}</p>
        </div>
      )}

      {loading && !summary && (
        <div className="tasks-empty-state">
          <p>Loading analytics...</p>
        </div>
      )}

      {!loading && summary && (
        <>
          <div className="analytics-kpi-grid">
            <article className="analytics-kpi-card">
              <p className="analytics-kpi-label">Task Completion</p>
              <p className="analytics-kpi-value">
                {summary.tasks.completed} / {summary.tasks.total}
              </p>
              <p className="analytics-kpi-sub">{Math.round(summary.tasks.completionRatePercent)}% completion rate</p>
            </article>
            <article className="analytics-kpi-card">
              <p className="analytics-kpi-label">Total XP</p>
              <p className="analytics-kpi-value">{summary.xp.totalExperience}</p>
              <p className="analytics-kpi-sub">Level {summary.xp.level}</p>
            </article>
            <article className="analytics-kpi-card">
              <p className="analytics-kpi-label">Achievements</p>
              <p className="analytics-kpi-value">{summary.achievements.unlockedCount}</p>
              <p className="analytics-kpi-sub">Unlocked badges</p>
            </article>
          </div>

          <div className="analytics-trend-grid">
            <article className="analytics-trend-card">
              <h4>Tasks Completed (Last 7 Days)</h4>
              <TrendBars points={summary.tasks.completedLast7Days} />
            </article>
            <article className="analytics-trend-card">
              <h4>XP Gained (Last 7 Days)</h4>
              <TrendBars points={summary.xp.gainedLast7Days} />
            </article>
          </div>
        </>
      )}
    </section>
  );
};
