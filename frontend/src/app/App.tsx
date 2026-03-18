import { useCallback, useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './App.css';
import '../features/focus/styles.css';
import '../features/customization/styles.css';
import './styles/consistency.css';
import { AnalyticsBoard } from '../features/analytics';
import { AuthCard, useAuth } from '../features/auth';
import {
  CustomizationWorkspace,
  getColorSkinAssetSrc,
  useCustomization,
} from '../features/customization';
import {
  FOCUS_SURVEY_STORAGE_KEY,
  FOCUS_TIMER_STORAGE_KEY,
  FocusTimerCard,
  getStudyHealthSnapshot,
} from '../features/focus';
import { LeaderboardBoard } from '../features/leaderboard';
import {
  AchievementsPanel,
  ActivityFeed,
  ConnectionAlert,
  getGreetingByHour,
  getNextLevelXp,
  getSlimeXpPercentage,
  QuickStats,
  SlimeCompanionCard,
  StudyHealthDevPanel,
  type SidebarTab,
  type TabId,
  useSlimeData,
} from '../features/slime';
import { getTasks, TasksBoard } from '../features/tasks';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';

const PHONE_BREAKPOINT = 768;
const DASHBOARD_DAILY_TASK_GOAL = 5;
const UI_THEME_STORAGE_KEY = 'myslime.ui.theme';

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
  const [isGameboyTheme, setIsGameboyTheme] = useState(() => window.localStorage.getItem(UI_THEME_STORAGE_KEY) === 'gameboy');
  const [dashboardTaskStats, setDashboardTaskStats] = useState({
    completedTasks: 0,
    completedToday: 0,
    dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
  });
  const [localStudyHealth, setLocalStudyHealth] = useState(() => getStudyHealthSnapshot());
  const isDevFeaturesEnabled = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const backendStudyHealth = slimeData?.studyHealth;
  const effectiveStudyHealthPercentage = backendStudyHealth
    ? (backendStudyHealth.maxHp > 0 ? (backendStudyHealth.currentHp / backendStudyHealth.maxHp) * 100 : 0)
    : localStudyHealth.healthPercentage;
  const effectiveDailyGoalMinutes = backendStudyHealth?.dailyGoalMinutes ?? localStudyHealth.targetDailyMinutes;
  const effectiveTodayFocusedMinutes = backendStudyHealth?.todayFocusedMinutes ?? localStudyHealth.todayFocusedMinutes;
  const effectiveDayStreak = backendStudyHealth?.dayStreak ?? 0;

  const greeting = getGreetingByHour(new Date().getHours());
  const equippedColorGradient =
    customizationOverview?.catalog.find((item) => item.id === customizationOverview?.equippedBySlot?.color)?.previewGradient;
  const equippedColorImageSrc = getColorSkinAssetSrc(customizationOverview?.equippedBySlot?.color);

  useEffect(() => {
    if (isGameboyTheme) {
      document.body.classList.add('theme-gameboy');
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, 'gameboy');
      return;
    }

    document.body.classList.remove('theme-gameboy');
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, 'classic');
  }, [isGameboyTheme]);

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

  useEffect(() => {
    setLocalStudyHealth(getStudyHealthSnapshot());
  }, [activeTab]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === FOCUS_TIMER_STORAGE_KEY || event.key === FOCUS_SURVEY_STORAGE_KEY) {
        setLocalStudyHealth(getStudyHealthSnapshot());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


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
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'leaderboard', name: 'Leaderboard' },
    { id: 'focus', name: 'Focus Session' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'achievements', name: 'Achievements' },
    { id: 'customize', name: 'Customize' },
    { id: 'settings', name: 'Settings' },
  ];
  const isFocusPage = activeTab === 'focus';

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
              isGameboyTheme={isGameboyTheme}
              onToggleTheme={() => setIsGameboyTheme((current) => !current)}
            />

            <ConnectionAlert error={slimeError} onCreateAccount={() => undefined} />
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <QuickStats
              slimeData={slimeData}
              taskStats={dashboardTaskStats}
              todayFocusedMinutes={effectiveTodayFocusedMinutes}
              dailyGoalMinutes={effectiveDailyGoalMinutes}
              dayStreak={effectiveDayStreak}
            />

            <div className="content-grid">
              <SlimeCompanionCard
                slimeData={slimeData}
                xpPercentage={getSlimeXpPercentage(slimeData)}
                nextLevelXP={getNextLevelXp(slimeData)}
                studyHealthPercentage={effectiveStudyHealthPercentage}
                studyHealthCurrentHp={backendStudyHealth?.currentHp ?? null}
                studyHealthMaxHp={backendStudyHealth?.maxHp ?? null}
                targetDailyMinutes={effectiveDailyGoalMinutes}
                onStartFocusSession={() => handleTabChange('focus')}
                onOpenCustomize={() => handleTabChange('customize')}
                coinBalance={customizationOverview?.wallet.coins ?? 0}
                customizationCatalog={customizationOverview?.catalog ?? []}
                equippedBySlot={customizationOverview?.equippedBySlot ?? {}}
              />
              {isDevFeaturesEnabled ? (
                <StudyHealthDevPanel token={token} onAfterSettle={fetchSlimeData} />
              ) : (
                <ActivityFeed />
              )}
            </div>
          </>
        )}

        {activeTab === 'focus' && (
          <section className="focus-session-page" aria-label="Dedicated focus session page">
            <FocusTimerCard
              token={token}
              slimeName={slimeData?.name}
              slimeBodyGradient={equippedColorGradient}
              slimeBodyImageSrc={equippedColorImageSrc ?? undefined}
              onSessionLockChange={handleFocusSessionLockChange}
              systemWarningMessage={focusSystemWarning}
              onClearSystemWarning={() => setFocusSystemWarning(null)}
              onStudyHealthSync={fetchSlimeData}
              isDevToolsEnabled={isDevFeaturesEnabled}
            />
          </section>
        )}

        {activeTab === 'tasks' && <TasksBoard token={token} />}

        {activeTab === 'analytics' && <AnalyticsBoard token={token} />}

        {activeTab === 'leaderboard' && <LeaderboardBoard token={token} currentUserId={user?.id ?? null} />}

        {activeTab === 'achievements' && <AchievementsPanel achievementProgress={slimeData?.achievementProgress ?? []} />}

        {activeTab === 'customize' && <CustomizationWorkspace token={token} slimeName={slimeData?.name} />}

        {activeTab === 'settings' && (
          <section className="tasks-board" aria-label="Settings">
            <div className="tasks-board-header">
              <div>
                <h3>Settings</h3>
                <p>Application preferences and account controls.</p>
              </div>
            </div>
            <div className="tasks-create-card">
              <h4>Appearance</h4>
              <p className="focus-roadmap-note">Current theme: {isGameboyTheme ? 'Game Boy' : 'Classic'}</p>
              <div className="tasks-create-actions">
                <button type="button" className="btn-cta" onClick={() => setIsGameboyTheme((current) => !current)}>
                  {isGameboyTheme ? 'Switch to Classic Theme' : 'Switch to Game Boy Theme'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
