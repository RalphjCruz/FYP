import { useCallback, useEffect, useRef, useState } from 'react';
import { type SidebarTab, type TabId } from '../../features/slime';

const NAV_DROPDOWN_BREAKPOINT_PX = 1190;

type AppSidebarProps = {
  tabs: readonly SidebarTab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export const AppSidebar = ({
  tabs,
  activeTab,
  onTabChange,
}: AppSidebarProps) => {
  const brandLogoSrc = '/branding/MySlimeLogo.png';
  const navShellRef = useRef<HTMLElement | null>(null);
  const navLinksRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [useDropdown, setUseDropdown] = useState(false);

  const evaluateNavFit = useCallback(() => {
    if (window.innerWidth <= NAV_DROPDOWN_BREAKPOINT_PX) {
      setUseDropdown(true);
      return;
    }

    const navShell = navShellRef.current;
    const brand = brandRef.current;
    const measure = measureRef.current;
    if (!navShell || !brand || !measure) {
      return;
    }

    const shellStyles = window.getComputedStyle(navShell);
    const shellPaddingLeft = Number.parseFloat(shellStyles.paddingLeft) || 0;
    const shellPaddingRight = Number.parseFloat(shellStyles.paddingRight) || 0;
    const shellContentWidth = navShell.clientWidth - shellPaddingLeft - shellPaddingRight;
    const brandWidth = brand.offsetWidth;
    const requiredTabsWidth = measure.scrollWidth + 18;
    const availableTabsWidth = shellContentWidth - brandWidth - 14;
    setUseDropdown(requiredTabsWidth > availableTabsWidth);
  }, []);

  useEffect(() => {
    evaluateNavFit();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            evaluateNavFit();
          });

    if (resizeObserver) {
      if (navShellRef.current) {
        resizeObserver.observe(navShellRef.current);
      }
      if (brandRef.current) {
        resizeObserver.observe(brandRef.current);
      }
    }

    const handleResize = () => evaluateNavFit();
    window.addEventListener('resize', handleResize);

    void (document.fonts?.ready
      ?.then(() => {
        evaluateNavFit();
      })
      .catch(() => undefined));

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [evaluateNavFit, tabs.length]);

  useEffect(() => {
    if (useDropdown) {
      return;
    }

    const navLinks = navLinksRef.current;
    if (!navLinks) {
      return;
    }

    if (navLinks.scrollWidth > navLinks.clientWidth + 1) {
      setUseDropdown(true);
    }
  }, [activeTab, tabs, useDropdown]);

  return (
    <header ref={navShellRef} className="top-nav-shell" aria-label="Primary navigation">
      <div ref={brandRef} className="top-nav-brand">
        <img src={brandLogoSrc} alt="MySlime" className="top-nav-brand-logo" />
      </div>

      <div className="top-nav-measure" ref={measureRef} aria-hidden="true">
        {tabs.map((tab) => (
          <span key={tab.id} className="top-nav-link">
            {tab.name}
          </span>
        ))}
      </div>

      {useDropdown ? (
        <label className="top-nav-dropdown">
          <select
            className="top-nav-dropdown-select"
            value={activeTab}
            onChange={(event) => onTabChange(event.target.value as TabId)}
            aria-label="Select page"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <nav ref={navLinksRef} className="top-nav-links" aria-label="Section tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`top-nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
