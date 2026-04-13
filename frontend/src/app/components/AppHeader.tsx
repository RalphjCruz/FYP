type AppHeaderProps = {
  greeting: string;
  username?: string;
  onLogout: () => void;
  isGameboyTheme: boolean;
  onToggleTheme: () => void;
};

export const AppHeader = ({ greeting, username, onLogout, isGameboyTheme, onToggleTheme }: AppHeaderProps) => {
  return (
    <header className="page-header">
      <div className="header-content">
        <div>
          <div className="greeting">
            {greeting}, {username || 'Student'}!
          </div>
          <h2 className="page-title">Your Productivity Dashboard</h2>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={onToggleTheme}>
            {isGameboyTheme ? 'Classic Theme' : 'Game Boy Theme'}
          </button>
          <button className="btn-refresh" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
