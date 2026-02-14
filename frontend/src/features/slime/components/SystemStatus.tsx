import type { SlimeData } from '../types';

type SystemStatusProps = {
  slimeData: SlimeData | null;
};

export const SystemStatus = ({ slimeData }: SystemStatusProps) => {
  return (
    <div className="system-status">
      <div className="status-header">
        <span className="status-title">{'\u{1F5C4}\u{FE0F}'} System Status</span>
        <span className="status-time">Last checked: just now</span>
      </div>
      <div className="status-items">
        <div className="status-item">
          <div className={`status-dot ${slimeData ? 'success' : 'warning'}`}></div>
          <span>Database</span>
          <span className="status-value">
            {slimeData ? `\u2713 Connected (User #${slimeData.user.id})` : '\u23F3 Connecting...'}
          </span>
        </div>
        <div className="status-item">
          <div className="status-dot success"></div>
          <span>Backend API</span>
          <span className="status-value">{'\u2713'} Online</span>
        </div>
        <div className="status-item">
          <div className="status-dot success"></div>
          <span>Frontend</span>
          <span className="status-value">{'\u2713'} Loaded</span>
        </div>
      </div>
    </div>
  );
};
