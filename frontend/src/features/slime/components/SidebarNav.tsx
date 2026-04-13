export type TabId = 'dashboard' | 'focus' | 'tasks' | 'analytics' | 'leaderboard' | 'achievements' | 'customize' | 'settings';

export type SidebarTab = {
  id: TabId;
  name: string;
  icon?: string;
};

type SidebarNavProps = {
  tabs: readonly SidebarTab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  compact?: boolean;
  className?: string;
};

const joinClassNames = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export const SidebarNav = ({ tabs, activeTab, onTabChange, compact = false, className }: SidebarNavProps) => {
  return (
    <nav className={joinClassNames('grid gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`flex w-full items-center rounded-lg border-2 border-gb-border px-3 py-3 text-left font-sans text-base font-semibold transition sm:text-lg ${
            activeTab === tab.id
              ? 'bg-gb-bg text-gb-text'
              : 'bg-gb-panel text-gb-text hover:bg-gb-bg/80'
          } ${compact ? 'justify-center' : 'justify-start gap-2'}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.icon ? <span aria-hidden="true">{tab.icon}</span> : null}
          {!compact && <span>{tab.name}</span>}
        </button>
      ))}
    </nav>
  );
};
