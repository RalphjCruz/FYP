import { useEffect, useState } from 'react';
import './App.css';
import { type SidebarTab, type TabId } from '../features/slime/components/SidebarNav';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { QuickStats } from '../features/slime/components/QuickStats';
import { SystemStatus } from '../features/slime/components/SystemStatus';
import { ConnectionAlert } from '../features/slime/components/ConnectionAlert';
import { SlimeCompanionCard } from '../features/slime/components/SlimeCompanionCard';
import { ActivityFeed } from '../features/slime/components/ActivityFeed';
import { useSlimeData } from '../features/slime/hooks/useSlimeData';

const PHONE_BREAKPOINT = 768;

function App() {
  const { slimeData, loading, error, fetchSlimeData, createTestUser } = useSlimeData();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const handleResize = () => {
      const isPhone = window.innerWidth <= PHONE_BREAKPOINT;
      setIsPhoneScreen(isPhone);

      if (isPhone) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getXPPercentage = () => {
    if (!slimeData) return 0;
    const xpForNextLevel = slimeData.level * 100;
    return (slimeData.experience / xpForNextLevel) * 100;
  };

  const getNextLevelXP = () => {
    if (!slimeData) return 100;
    return slimeData.level * 100;
  };

  const tabs: readonly SidebarTab[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '\u{1F4CA}' },
    { id: 'focus', name: 'Focus Session', icon: '\u{23F1}\u{FE0F}' },
    { id: 'tasks', name: 'Tasks', icon: '\u{2713}' },
  ];

  return (
    <div className="app">
      <AppSidebar
        slimeData={slimeData}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSidebarCollapsed={isSidebarCollapsed}
        isPhoneScreen={isPhoneScreen}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main className="main-content">
        <AppHeader
          greeting={greeting}
          username={slimeData?.user.username?.split(' ')[0]}
          loading={loading}
          onRefresh={fetchSlimeData}
        />

        <ConnectionAlert error={error} onCreateAccount={createTestUser} />

        <QuickStats slimeData={slimeData} />

        <div className="content-grid">
          <SlimeCompanionCard
            slimeData={slimeData}
            xpPercentage={getXPPercentage()}
            nextLevelXP={getNextLevelXP()}
          />
          <ActivityFeed />
        </div>

        <SystemStatus slimeData={slimeData} />
      </main>
    </div>
  );
}

export default App;
