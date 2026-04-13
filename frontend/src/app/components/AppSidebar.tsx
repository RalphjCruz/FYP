import { useEffect, useMemo, useRef, useState } from 'react';
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

  if (isPhoneScreen) {
    return (
      <aside
        ref={asideRef}
        className="mb-3 rounded-xl border-2 border-gb-border bg-gb-panel p-3 md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0" aria-hidden="true">
            <img src={brandLogoSrc} alt="MySlime" className="h-8 w-auto object-contain sm:h-10" />
          </div>

          <button
            type="button"
            className="rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base font-semibold text-gb-text sm:text-lg"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-dropdown"
          >
            {activeTabName} {isMobileMenuOpen ? '^' : 'v'}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div id="mobile-nav-dropdown" className="mt-3 border-t-2 border-gb-border pt-3">
            <SidebarNav
              tabs={tabs}
              activeTab={activeTab}
              className="grid gap-2"
              onTabChange={(tab) => {
                onTabChange(tab);
                setIsMobileMenuOpen(false);
              }}
            />
            <div className="mt-3 flex items-center justify-between rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base text-gb-text">
              <span>{slimeData?.user.username || 'Loading...'}</span>
              <span>Lv. {slimeData?.level || 1}</span>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      className={`hidden shrink-0 rounded-xl border-2 border-gb-border bg-gb-panel p-3 md:flex md:flex-col ${
        isSidebarCollapsed ? 'md:w-24' : 'md:w-72'
      }`}
      aria-label="Desktop navigation"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <img src={brandLogoSrc} alt="MySlime" className="h-10 w-auto object-contain" />
        </div>

        <button
          type="button"
          className="rounded-lg border-2 border-gb-border bg-gb-bg px-2 py-1 font-sans text-lg font-bold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px"
          onClick={() => {
            if (!isPhoneScreen) {
              onToggleSidebar();
            }
          }}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          disabled={isPhoneScreen}
        >
          {isSidebarCollapsed ? '>' : '<'}
        </button>
      </div>

      <SidebarNav
        tabs={tabs}
        activeTab={activeTab}
        compact={isSidebarCollapsed}
        onTabChange={onTabChange}
        className="flex-1"
      />

      <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg p-3">
        <div className={`flex ${isSidebarCollapsed ? 'justify-center' : 'items-center gap-3'}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gb-border bg-gb-panel font-sans text-lg font-bold text-gb-text">
            {slimeData?.user.username?.[0] || 'U'}
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate font-sans text-base font-semibold text-gb-text">{slimeData?.user.username || 'Loading...'}</div>
              <div className="font-sans text-sm text-gb-text">Level {slimeData?.level || 1} Student</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
