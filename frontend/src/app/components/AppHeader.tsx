type AppHeaderProps = {
  greeting: string;
  username?: string;
  loading: boolean;
  onRefresh: () => void;
};

export const AppHeader = ({ greeting, username, loading, onRefresh }: AppHeaderProps) => {
  return (
    <header className="page-header">
      <div className="header-content">
        <div>
          <div className="greeting">
            {greeting}, {username || 'Student'}! {'\u{1F44B}'}
          </div>
          <h2 className="page-title">Your Productivity Dashboard</h2>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Notifications">
            {'\u{1F514}'}
            <span className="badge">3</span>
          </button>
          <button className="btn-refresh" onClick={onRefresh} disabled={loading}>
            <span className="refresh-icon">{loading ? '\u{23F3}' : '\u{1F504}'}</span>
            {loading ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>
    </header>
  );
};
