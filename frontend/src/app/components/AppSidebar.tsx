import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
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
  const brandLogoSrc = '/branding/MySlimeLogo.png';
  const asideRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeTabName = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.name ?? 'Menu', [tabs, activeTab]);

  useEffect(() => {
    if (!isPhoneScreen) {
      const closeMenuFrame = window.requestAnimationFrame(() => {
        setIsMobileMenuOpen(false);
      });

      return () => window.cancelAnimationFrame(closeMenuFrame);
    }
  }, [isPhoneScreen]);

  useEffect(() => {
    if (!isPhoneScreen || !isMobileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !asideRef.current || asideRef.current.contains(target)) {
        return;
      }

      setIsMobileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isPhoneScreen, isMobileMenuOpen]);

  const handleSidebarClick = (event: MouseEvent<HTMLElement>) => {
    if (isPhoneScreen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('button, a, input, select, textarea, label, nav, .sidebar-footer')) {
      return;
    }

    onToggleSidebar();
  };

  if (isPhoneScreen) {
    return (
      <aside ref={asideRef} className="sidebar mobile-dropdown" aria-label="Mobile navigation">
        <div className="mobile-nav-bar">
          <div className="mobile-brand" aria-hidden="true">
            <img src={brandLogoSrc} alt="MySlime" className="brand-logo mobile" />
          </div>

          <button
            type="button"
            className={`mobile-nav-toggle ${isMobileMenuOpen ? 'open' : ''} ${activeTab === 'dashboard' ? 'dashboard-active' : ''}`}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-dropdown"
          >
            <span className="mobile-nav-active">{activeTabName}</span>
            <span className="mobile-nav-chevron">{isMobileMenuOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div id="mobile-nav-dropdown" className="mobile-nav-dropdown">
            <SidebarNav
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tab) => {
                onTabChange(tab);
                setIsMobileMenuOpen(false);
              }}
            />
            <div className="mobile-user-chip">
              <span>{slimeData?.user.username || 'Loading...'}</span>
              <span>Level {slimeData?.level || 1}</span>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
      onClick={handleSidebarClick}
      title={isPhoneScreen ? undefined : 'Click sidebar area to collapse/expand'}
    >
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-copy">
            <img src={brandLogoSrc} alt="MySlime" className="brand-logo" />
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
