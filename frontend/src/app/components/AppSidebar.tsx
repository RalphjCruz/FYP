import { SidebarNav, type SidebarTab, type TabId, type SlimeData } from '../../features/slime';

type AppSidebarProps = {
  slimeData: SlimeData | null;
  tabs: readonly SidebarTab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isSidebarCollapsed: boolean;
  isPhoneScreen: boolean;
  onToggleSidebar: () => void;
};

export const AppSidebar = ({
  slimeData,
  tabs,
  activeTab,
  onTabChange,
  isSidebarCollapsed,
  isPhoneScreen,
  onToggleSidebar,
}: AppSidebarProps) => {
  const handleSidebarClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isPhoneScreen) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, label')) {
      return;
    }

    onToggleSidebar();
  };

  return (
    <aside
      className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
      onClick={handleSidebarClick}
      title={isPhoneScreen ? undefined : 'Click sidebar area to collapse/expand'}
    >
      <div className="sidebar-top">
        <div className="logo">
          <div className="slime-icon-mini">
            <div className="mini-slime"></div>
          </div>
          <div>
            <h1>MySlime</h1>
            <p className="tagline">Level up your productivity</p>
          </div>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => {
            if (!isPhoneScreen) {
              onToggleSidebar();
            }
          }}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          disabled={isPhoneScreen}
        >
          {isSidebarCollapsed ? '\u203A' : '\u2039'}
        </button>
      </div>

      <SidebarNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar-container">
            <div className="avatar">
              <span>{slimeData?.user.username?.[0] || 'U'}</span>
            </div>
            <div className="status-dot"></div>
          </div>
          <div className="user-details">
            <div className="user-name">{slimeData?.user.username || 'Loading...'}</div>
            <div className="user-level">Level {slimeData?.level || 1} Student</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
