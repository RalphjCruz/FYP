import type { SlimeData } from '../types';

type QuickTaskStats = {
  completedTasks: number;
  completedToday: number;
  dailyGoal: number;
};

type QuickStatsProps = {
  slimeData: SlimeData | null;
  taskStats: QuickTaskStats;
  todayFocusedMinutes: number;
  dailyGoalMinutes: number;
  dayStreak: number;
};

const formatHoursMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
};

export const QuickStats = ({ slimeData, taskStats, todayFocusedMinutes, dailyGoalMinutes, dayStreak }: QuickStatsProps) => {
  const dailyGoal = Math.max(1, taskStats.dailyGoal);
  const dailyProgressPercent = Math.min(100, Math.round((taskStats.completedToday / dailyGoal) * 100));
  const safeDailyGoalMinutes = Math.max(1, Math.round(dailyGoalMinutes));
  const safeTodayFocusedMinutes = Math.max(0, Math.round(todayFocusedMinutes));
  const focusProgressPercent = Math.min(100, Math.round((safeTodayFocusedMinutes / safeDailyGoalMinutes) * 100));
  const formattedFocusToday = formatHoursMinutes(safeTodayFocusedMinutes);
  const formattedFocusGoal = formatHoursMinutes(safeDailyGoalMinutes);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Quick statistics">
      <article className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Focus Time</h3>
        </header>
        <p className="mt-3 font-display text-2xl leading-relaxed text-gb-text sm:text-3xl">{formattedFocusToday}</p>
        <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Today</p>
        <div className="mt-3 space-y-2">
          <div className="h-3 overflow-hidden rounded border-2 border-gb-border bg-gb-panel/70" aria-hidden="true">
            <div className="h-full bg-gb-progress" style={{ width: `${focusProgressPercent}%` }}></div>
          </div>
          <p className="font-sans text-base text-gb-text sm:text-lg">
            {focusProgressPercent}% of {formattedFocusGoal} goal
          </p>
        </div>
      </article>

      <article className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Experience</h3>
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-2 py-1 font-sans text-base text-gb-text sm:text-lg">
            +0 today
          </span>
        </header>
        <p className="mt-3 font-display text-2xl leading-relaxed text-gb-text sm:text-3xl">
          {slimeData?.totalExperience ?? slimeData?.experience ?? 0}
        </p>
        <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Total XP</p>
      </article>

      <article className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Tasks</h3>
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-2 py-1 font-sans text-base text-gb-text sm:text-lg">
            {taskStats.completedToday}/{dailyGoal} today
          </span>
        </header>
        <p className="mt-3 font-display text-2xl leading-relaxed text-gb-text sm:text-3xl">{taskStats.completedTasks}</p>
        <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Tasks Done</p>
        <div className="mt-3 space-y-2">
          <div className="h-3 overflow-hidden rounded border-2 border-gb-border bg-gb-panel/70" aria-hidden="true">
            <div className="h-full bg-gb-progress" style={{ width: `${dailyProgressPercent}%` }}></div>
          </div>
          <p className="font-sans text-base text-gb-text sm:text-lg">{dailyProgressPercent}% of daily goal</p>
        </div>
      </article>

      <article className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Streak</h3>
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-2 py-1 font-sans text-base text-gb-text sm:text-lg">
            Current
          </span>
        </header>
        <p className="mt-3 font-display text-2xl leading-relaxed text-gb-text sm:text-3xl">{Math.max(0, Math.round(dayStreak))}</p>
        <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">Day Streak</p>
      </article>
    </section>
  );
};
