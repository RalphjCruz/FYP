export type TabId = 'dashboard' | 'focus' | 'tasks' | 'achievements' | 'customize';

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

      <div className="nav-divider"></div>

      <button type="button" className="nav-item secondary">
        <span className="icon">{'\u{1F4C8}'}</span>
        <span className="nav-text">Analytics</span>
      </button>
      <button
        type="button"
        className={`nav-item secondary ${activeTab === 'customize' ? 'active' : ''}`}
        onClick={() => onTabChange('customize')}
      >
        <span className="icon">{'\u{1F3A8}'}</span>
        <span className="nav-text">Customize</span>
      </button>
    </nav>
  );
};
