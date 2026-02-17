import { useEffect, useState } from 'react';
import './App.css';
import { AuthCard, useAuth } from '../features/auth';
import { FocusTimerCard } from '../features/focus';
import {
  ActivityFeed,
  ConnectionAlert,
  getGreetingByHour,
  getNextLevelXp,
  getSlimeXpPercentage,
  QuickStats,
  SlimeCompanionCard,
  SystemStatus,
  type SidebarTab,
  type TabId,
  useSlimeData,
} from '../features/slime';
import { TasksBoard } from '../features/tasks';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';

const PHONE_BREAKPOINT = 768;

function App() {
  const { token, user, loading: authLoading, initializing, error: authError, isAuthenticated, submitAuth, logout } = useAuth();
  const { slimeData, loading: slimeLoading, error: slimeError, fetchSlimeData } = useSlimeData(token);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);

  const greeting = getGreetingByHour(new Date().getHours());
  const loading = authLoading || slimeLoading;

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

  if (initializing) {
    return (
      <div className="app">
        <main className="main-content">
          <section className="tasks-board">
            <p>Checking your session...</p>
          </section>
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return (
      <div className="app">
        <main className="main-content">
          <AuthCard loading={authLoading} error={authError} onSubmit={submitAuth} />
        </main>
      </div>
    );
  }

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
          username={slimeData?.user.username?.split(' ')[0] || user?.username || 'Student'}
          loading={loading}
          onRefresh={fetchSlimeData}
          onLogout={logout}
        />

        <ConnectionAlert error={slimeError} onCreateAccount={() => undefined} />

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

        {activeTab === 'tasks' && <TasksBoard token={token} />}
      </main>
    </div>
  );
}

export default App;
