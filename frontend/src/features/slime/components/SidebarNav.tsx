export type TabId = 'dashboard' | 'focus' | 'tasks' | 'analytics' | 'leaderboard' | 'achievements' | 'customize';

export type SidebarTab = {
  id: TabId;
  name: string;
  icon: string;
};

type SidebarNavProps = {
  tabs: readonly SidebarTab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export const SidebarNav = ({ tabs, activeTab, onTabChange }: SidebarNavProps) => {
  return (
    <nav className="nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="icon">{tab.icon}</span>
          <span className="nav-text">{tab.name}</span>
          {activeTab === tab.id && <div className="active-indicator"></div>}
        </button>
      ))}
    </nav>
  );
};
