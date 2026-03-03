import { useCallback, useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './App.css';
import '../features/focus/styles.css';
import '../features/customization/styles.css';
import { AuthCard, useAuth } from '../features/auth';
import { CustomizationWorkspace, getColorSkinAssetSrc, useCustomization } from '../features/customization';
import { FocusTimerCard } from '../features/focus';
import {
  addSlimeXpDev,
  AchievementsPanel,
  ActivityFeed,
  ConnectionAlert,
  getGreetingByHour,
  getNextLevelXp,
  getSlimeXpPercentage,
  QuickStats,
  resetSlimeAchievementsDev,
  resetSlimeXpDev,
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
  const { token, user, loading: authLoading, initializing, error: authError, isAuthenticated, submitAuth, logout, clearError } = useAuth();
  const { slimeData, loading: slimeLoading, error: slimeError, fetchSlimeData } = useSlimeData(token);
  const { overview: customizationOverview, refreshOverview: refreshCustomizationOverview } = useCustomization(token);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isFocusSessionLocked, setIsFocusSessionLocked] = useState(false);
  const [focusSystemWarning, setFocusSystemWarning] = useState<string | null>(null);
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);

  const greeting = getGreetingByHour(new Date().getHours());
  const loading = authLoading || slimeLoading;
  const equippedColorGradient =
    customizationOverview?.catalog.find((item) => item.id === customizationOverview?.equippedBySlot?.color)?.previewGradient;
  const equippedColorImageSrc = getColorSkinAssetSrc(customizationOverview?.equippedBySlot?.color);

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

  useEffect(() => {
    if ((activeTab === 'dashboard' || activeTab === 'achievements') && token) {
      void fetchSlimeData();
      void refreshCustomizationOverview();
    }
  }, [activeTab, fetchSlimeData, refreshCustomizationOverview, token]);

  const tabs: readonly SidebarTab[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '\u{1F4CA}' },
    { id: 'focus', name: 'Focus Session', icon: '\u{23F1}\u{FE0F}' },
    { id: 'tasks', name: 'Tasks', icon: '\u{2713}' },
    { id: 'achievements', name: 'Achievements', icon: '\u{1F3C6}' },
  ];
  const isFocusPage = activeTab === 'focus';
  const isDevFeaturesEnabled = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleTabChange = (tab: TabId) => {
    if (isFocusSessionLocked && activeTab === 'focus' && tab !== 'focus') {
      setFocusSystemWarning('Finish or reset your focus session before leaving this page.');
      return;
    }

    setFocusSystemWarning(null);
    setActiveTab(tab);
  };

  const handleFocusSessionLockChange = useCallback((isLocked: boolean) => {
    setIsFocusSessionLocked(isLocked);
    if (!isLocked) {
      setFocusSystemWarning(null);
    }
  }, []);

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
          <AuthCard loading={authLoading} error={authError} onSubmit={submitAuth} onClearError={clearError} />
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
        onTabChange={handleTabChange}
        isSidebarCollapsed={isSidebarCollapsed}
        isPhoneScreen={isPhoneScreen}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main className={`main-content ${isFocusPage ? 'focus-main-content' : ''}`}>
        {!isFocusPage && (
          <>
            <AppHeader
              greeting={greeting}
              username={slimeData?.user.username?.split(' ')[0] || user?.username || 'Student'}
              loading={loading}
              onRefresh={fetchSlimeData}
              onLogout={logout}
            />

            <ConnectionAlert error={slimeError} onCreateAccount={() => undefined} />
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <QuickStats slimeData={slimeData} />

            <div className="content-grid">
              <SlimeCompanionCard
                slimeData={slimeData}
                xpPercentage={getSlimeXpPercentage(slimeData)}
                nextLevelXP={getNextLevelXp(slimeData)}
                onStartFocusSession={() => handleTabChange('focus')}
                onOpenCustomize={() => handleTabChange('customize')}
                onDevAddXp={
                  isDevFeaturesEnabled
                    ? async () => {
                        if (!token) {
                          return;
                        }

                        await addSlimeXpDev(token, 60);
                        await fetchSlimeData();
                      }
                    : undefined
                }
                onDevResetXp={
                  isDevFeaturesEnabled
                    ? async () => {
                        if (!token) {
                          return;
                        }

                        await resetSlimeXpDev(token);
                        await fetchSlimeData();
                      }
                    : undefined
                }
                onDevResetAchievements={
                  isDevFeaturesEnabled
                    ? async () => {
                        if (!token) {
                          return;
                        }

                        await resetSlimeAchievementsDev(token);
                        await fetchSlimeData();
                      }
                    : undefined
                }
                coinBalance={customizationOverview?.wallet.coins ?? 0}
                customizationCatalog={customizationOverview?.catalog ?? []}
                equippedBySlot={customizationOverview?.equippedBySlot ?? {}}
              />
              <ActivityFeed />
            </div>

            <SystemStatus slimeData={slimeData} />
          </>
        )}

        {activeTab === 'focus' && (
          <section className="focus-session-page" aria-label="Dedicated focus session page">
            <FocusTimerCard
              slimeName={slimeData?.name}
              slimeBodyGradient={equippedColorGradient}
              slimeBodyImageSrc={equippedColorImageSrc ?? undefined}
              onSessionLockChange={handleFocusSessionLockChange}
              systemWarningMessage={focusSystemWarning}
              onClearSystemWarning={() => setFocusSystemWarning(null)}
            />
          </section>
        )}

        {activeTab === 'tasks' && <TasksBoard token={token} />}

        {activeTab === 'achievements' && <AchievementsPanel achievementProgress={slimeData?.achievementProgress ?? []} />}

        {activeTab === 'customize' && <CustomizationWorkspace token={token} slimeName={slimeData?.name} />}
      </main>
    </div>
  );
}

export default App;
