import type { SlimeData } from '../types';

type QuickStatsProps = {
  slimeData: SlimeData | null;
};

export const QuickStats = ({ slimeData }: QuickStatsProps) => {
  return (
    <div className="quick-stats">
      <div className="stat-card highlight">
        <div className="stat-header">
          <div className="stat-icon-circle today">{`\u{23F1}\u{FE0F}`}</div>
          <div className="stat-badge">Today</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">0h 00m</div>
          <div className="stat-label">Focus Time</div>
          <div className="stat-progress">
            <div className="progress-mini">
              <div className="progress-fill" style={{ width: '0%' }}></div>
            </div>
            <span className="progress-text">0% of 4h goal</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-icon-circle xp">{'\u{2B50}'}</div>
          <div className="stat-change positive">+0 today</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">{slimeData?.totalExperience ?? slimeData?.experience ?? 0}</div>
          <div className="stat-label">Total XP</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-icon-circle tasks">{'\u{2713}'}</div>
          <div className="stat-change">0/5 today</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">0</div>
          <div className="stat-label">Tasks Done</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <div className="stat-icon-circle streak">{'\u{1F525}'}</div>
          <div className="stat-badge premium">Premium</div>
        </div>
        <div className="stat-body">
          <div className="stat-value">0</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>
    </div>
  );
};
