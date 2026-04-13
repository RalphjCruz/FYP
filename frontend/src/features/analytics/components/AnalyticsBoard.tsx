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
    <div className="mt-4 grid grid-cols-7 gap-2">
      {points.map((point) => (
        <div key={point.date} className="grid justify-items-center gap-1">
          <div className="flex h-24 w-full max-w-8 items-end overflow-hidden rounded border-2 border-gb-border bg-gb-bg/70">
            <div className="w-full bg-gb-progress" style={{ height: `${(point.value / maxValue) * 100}%` }}></div>
          </div>
          <span className="font-sans text-base text-gb-text sm:text-lg">{point.value}</span>
          <span className="font-sans text-base text-gb-text sm:text-lg">{formatDayLabel(point.date)}</span>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsBoard = ({ token }: AnalyticsBoardProps) => {
  const { summary, loading, error } = useAnalyticsSummary(token);

  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Analytics board">
      <header>
        <div>
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Analytics</h3>
          <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">
            Simple performance metrics from your tasks, XP progression, and achievements.
          </p>
        </div>
      </header>

      {error && (
        <div className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4" role="alert">
          <p className="font-sans text-base text-[#4d1212] sm:text-lg">{error}</p>
        </div>
      )}

      {loading && !summary && (
        <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
          <p className="font-sans text-base text-gb-text sm:text-lg">Loading analytics...</p>
        </div>
      )}

      {!loading && summary && (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
              <p className="font-sans text-base text-gb-text sm:text-lg">Task Completion</p>
              <p className="mt-2 font-display text-xl leading-relaxed text-gb-text sm:text-2xl">
                {summary.tasks.completed} / {summary.tasks.total}
              </p>
              <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">
                {Math.round(summary.tasks.completionRatePercent)}% completion rate
              </p>
            </article>
            <article className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
              <p className="font-sans text-base text-gb-text sm:text-lg">Total XP</p>
              <p className="mt-2 font-display text-xl leading-relaxed text-gb-text sm:text-2xl">{summary.xp.totalExperience}</p>
              <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Level {summary.xp.level}</p>
            </article>
            <article className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
              <p className="font-sans text-base text-gb-text sm:text-lg">Achievements</p>
              <p className="mt-2 font-display text-xl leading-relaxed text-gb-text sm:text-2xl">{summary.achievements.unlockedCount}</p>
              <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Unlocked badges</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
              <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Tasks Completed (Last 7 Days)</h4>
              <TrendBars points={summary.tasks.completedLast7Days} />
            </article>
            <article className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
              <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">XP Gained (Last 7 Days)</h4>
              <TrendBars points={summary.xp.gainedLast7Days} />
            </article>
          </div>
        </>
      )}
    </section>
  );
};
