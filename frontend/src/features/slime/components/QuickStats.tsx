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
    <div className="quick-stats">
      <div className="stat-card highlight">
        <div className="stat-header">
          <div className="stat-title-simple">Focus Time</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">{formattedFocusToday}</div>
          <div className="stat-label">Today</div>
          <div className="stat-progress">
            <div className="progress-mini">
              <div className="progress-fill" style={{ width: `${focusProgressPercent}%` }}></div>
            </div>
            <span className="progress-text">{focusProgressPercent}% of {formattedFocusGoal} goal</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-title-simple">Experience</div>
          <div className="stat-change positive">+0 today</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">{slimeData?.totalExperience ?? slimeData?.experience ?? 0}</div>
          <div className="stat-label">Total XP</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-title-simple">Tasks</div>
          <div className="stat-change">{taskStats.completedToday}/{dailyGoal} today</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">{taskStats.completedTasks}</div>
          <div className="stat-label">Tasks Done</div>
          <div className="stat-progress">
            <div className="progress-mini">
              <div className="progress-fill" style={{ width: `${dailyProgressPercent}%` }}></div>
            </div>
            <span className="progress-text">{dailyProgressPercent}% of daily goal</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-title-simple">Streak</div>
          <div className="stat-change">Current</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">{Math.max(0, Math.round(dayStreak))}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>
    </div>
  );
};
