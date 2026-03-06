import { useCallback, useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './App.css';
import '../features/focus/styles.css';
import '../features/customization/styles.css';
import { AnalyticsBoard } from '../features/analytics';
import { AuthCard, useAuth } from '../features/auth';
import {
  addCoinsDev as addCoinsDevApi,
  CustomizationWorkspace,
  getColorSkinAssetSrc,
  resetCoinsDev as resetCoinsDevApi,
  useCustomization,
} from '../features/customization';
import { FocusTimerCard } from '../features/focus';
import { LeaderboardBoard } from '../features/leaderboard';
import {
  addSlimeXpDev,
  AchievementsPanel,
  ActivityFeed,
  ConnectionAlert,
  DevPanel,
  getGreetingByHour,
  getNextLevelXp,
  getSlimeXpPercentage,
  QuickStats,
  resetSlimeAchievementsDev,
  resetSlimeXpDev,
  SlimeCompanionCard,
  type SidebarTab,
  type TabId,
  useSlimeData,
} from '../features/slime';
import { getTasks, resetTasksDev as resetTasksDevApi, TasksBoard } from '../features/tasks';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';

const PHONE_BREAKPOINT = 768;
const DASHBOARD_DAILY_TASK_GOAL = 5;

const isSameLocalDay = (leftDate: Date, rightDate: Date) =>
  leftDate.getFullYear() === rightDate.getFullYear()
  && leftDate.getMonth() === rightDate.getMonth()
  && leftDate.getDate() === rightDate.getDate();

function App() {
  const { token, user, loading: authLoading, initializing, error: authError, isAuthenticated, submitAuth, logout, clearError } = useAuth();
  const { slimeData, error: slimeError, fetchSlimeData } = useSlimeData(token);
  const { overview: customizationOverview, refreshOverview: refreshCustomizationOverview } = useCustomization(token);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isFocusSessionLocked, setIsFocusSessionLocked] = useState(false);
  const [focusSystemWarning, setFocusSystemWarning] = useState<string | null>(null);
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [dashboardTaskStats, setDashboardTaskStats] = useState({
    completedTasks: 0,
    completedToday: 0,
    dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
  });
  const [devActionLoading, setDevActionLoading] = useState(false);
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null);

  const greeting = getGreetingByHour(new Date().getHours());
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
    if (
      (activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'leaderboard' || activeTab === 'achievements') &&
      token
    ) {
      void fetchSlimeData();
      void refreshCustomizationOverview();
    }
  }, [activeTab, fetchSlimeData, refreshCustomizationOverview, token]);

  const loadDashboardTaskStats = useCallback(async () => {
    if (!token) {
      setDashboardTaskStats({
        completedTasks: 0,
        completedToday: 0,
        dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
      });
      return;
    }

    const now = new Date();

    try {
      const tasks = await getTasks(token);
      const completedTasks = tasks.filter((task) => task.status === 'completed');
      const completedToday = completedTasks.filter((task) => {
        if (!task.completedAt) {
          return false;
        }

        return isSameLocalDay(new Date(task.completedAt), now);
      }).length;

      setDashboardTaskStats({
        completedTasks: completedTasks.length,
        completedToday,
        dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
      });
    } catch {
      setDashboardTaskStats({
        completedTasks: 0,
        completedToday: 0,
        dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
      });
    }
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      return;
    }

    void loadDashboardTaskStats();
  }, [activeTab, loadDashboardTaskStats]);

  const tabs: readonly SidebarTab[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '\u{1F4CA}' },
    { id: 'analytics', name: 'Analytics', icon: '\u{1F4C8}' },
    { id: 'leaderboard', name: 'Leaderboard', icon: '\u{1F3C5}' },
    { id: 'focus', name: 'Focus Session', icon: '\u{23F1}\u{FE0F}' },
    { id: 'tasks', name: 'Tasks', icon: '\u{2713}' },
    { id: 'achievements', name: 'Achievements', icon: '\u{1F3C6}' },
    { id: 'customize', name: 'Customize', icon: '\u{1F3A8}' },
  ];
  const isFocusPage = activeTab === 'focus';
  const isDevFeaturesEnabled = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const refreshAfterDevAction = useCallback(async () => {
    await Promise.all([fetchSlimeData(), refreshCustomizationOverview(), loadDashboardTaskStats()]);
  }, [fetchSlimeData, loadDashboardTaskStats, refreshCustomizationOverview]);

  const runDevAction = useCallback(
    async (action: (authToken: string) => Promise<string>) => {
      if (!isDevFeaturesEnabled || !token) {
        return;
      }

      setDevActionLoading(true);
      setDevError(null);
      setDevNotice(null);

      try {
        const notice = await action(token);
        await refreshAfterDevAction();
        setDevNotice(notice);
      } catch (error) {
        setDevError(error instanceof Error ? error.message : 'Dev action failed');
      } finally {
        setDevActionLoading(false);
      }
    },
    [isDevFeaturesEnabled, refreshAfterDevAction, token],
  );

  const handleDevAddXp = useCallback(() => {
    void runDevAction(async (authToken) => {
      await addSlimeXpDev(authToken, 100);
      return 'Added 100 XP.';
    });
  }, [runDevAction]);

  const handleDevResetXp = useCallback(() => {
    void runDevAction(async (authToken) => {
      await resetSlimeXpDev(authToken);
      return 'XP reset.';
    });
  }, [runDevAction]);

  const handleDevResetAchievements = useCallback(() => {
    void runDevAction(async (authToken) => {
      const result = await resetSlimeAchievementsDev(authToken);
      return `Reset achievements (${result.deletedCount} removed).`;
    });
  }, [runDevAction]);

  const handleDevResetTasks = useCallback(() => {
    void runDevAction(async (authToken) => {
      const result = await resetTasksDevApi(authToken);
      return `Reset tasks (${result.deletedCount} removed).`;
    });
  }, [runDevAction]);

  const handleDevResetCoins = useCallback(() => {
    void runDevAction(async (authToken) => {
      const result = await resetCoinsDevApi(authToken);
      return `Coins reset to ${result.resetTo}.`;
    });
  }, [runDevAction]);

  const handleDevAddCoins = useCallback(() => {
    void runDevAction(async (authToken) => {
      await addCoinsDevApi(authToken, 100);
      return 'Added 100 coins.';
    });
  }, [runDevAction]);

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
              onLogout={logout}
            />

            <ConnectionAlert error={slimeError} onCreateAccount={() => undefined} />
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <QuickStats slimeData={slimeData} taskStats={dashboardTaskStats} />

            <div className="content-grid">
              <SlimeCompanionCard
                slimeData={slimeData}
                xpPercentage={getSlimeXpPercentage(slimeData)}
                nextLevelXP={getNextLevelXp(slimeData)}
                onStartFocusSession={() => handleTabChange('focus')}
                onOpenCustomize={() => handleTabChange('customize')}
                coinBalance={customizationOverview?.wallet.coins ?? 0}
                customizationCatalog={customizationOverview?.catalog ?? []}
                equippedBySlot={customizationOverview?.equippedBySlot ?? {}}
              />
              {isDevFeaturesEnabled ? (
                <DevPanel
                  loading={devActionLoading}
                  notice={devNotice}
                  error={devError}
                  onClearMessage={() => {
                    setDevNotice(null);
                    setDevError(null);
                  }}
                  onResetXp={handleDevResetXp}
                  onAddXp={handleDevAddXp}
                  onResetAchievements={handleDevResetAchievements}
                  onResetTasks={handleDevResetTasks}
                  onResetCoins={handleDevResetCoins}
                  onAddCoins={handleDevAddCoins}
                />
              ) : (
                <ActivityFeed />
              )}
            </div>
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
              isDevToolsEnabled={isDevFeaturesEnabled}
            />
          </section>
        )}

        {activeTab === 'tasks' && <TasksBoard token={token} />}

        {activeTab === 'analytics' && <AnalyticsBoard token={token} />}

        {activeTab === 'leaderboard' && <LeaderboardBoard token={token} currentUserId={user?.id ?? null} />}

        {activeTab === 'achievements' && <AchievementsPanel achievementProgress={slimeData?.achievementProgress ?? []} />}

        {activeTab === 'customize' && <CustomizationWorkspace token={token} slimeName={slimeData?.name} />}
      </main>
    </div>
  );
}

export default App;
