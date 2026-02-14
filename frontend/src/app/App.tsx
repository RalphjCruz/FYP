import { useEffect, useState } from 'react';
import './App.css';
import {
  ActivityFeed,
  ConnectionAlert,
  type SidebarTab,
  type TabId,
  QuickStats,
  SlimeCompanionCard,
  SystemStatus,
  useSlimeData,
  getGreetingByHour,
  getNextLevelXp,
  getSlimeXpPercentage,
} from '../features/slime';
import { FocusTimerCard } from '../features/focus';
import { TasksBoard } from '../features/tasks';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';

const PHONE_BREAKPOINT = 768;

function App() {
  const { slimeData, loading, error, fetchSlimeData, createTestUser } = useSlimeData();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);

  const greeting = getGreetingByHour(new Date().getHours());

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

        {activeTab === 'dashboard' && (
          <>
            <QuickStats slimeData={slimeData} />

            <div className="content-grid">
              <SlimeCompanionCard
                slimeData={slimeData}
                xpPercentage={getSlimeXpPercentage(slimeData)}
                nextLevelXP={getNextLevelXp(slimeData)}
              />
              <ActivityFeed />
            </div>

            <SystemStatus slimeData={slimeData} />
          </>
        )}

        {activeTab === 'focus' && (
          <div className="focus-grid">
            <FocusTimerCard />
            <SlimeCompanionCard
              slimeData={slimeData}
              xpPercentage={getSlimeXpPercentage(slimeData)}
              nextLevelXP={getNextLevelXp(slimeData)}
            />
          </div>
        )}

        {activeTab === 'tasks' && <TasksBoard />}
      </main>
    </div>
  );
}

export default App;
