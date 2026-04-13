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
  type StudyHealth,
  type TabId,
  useSlimeData,
} from '../features/slime';
import { TasksBoard, useDashboardTaskStats } from '../features/tasks';
import { env } from '../shared/config/env';
import { getSimulatedDayOffset } from '../shared/dev/simulatedDay';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';
import { useResponsiveSidebar, useUiTheme } from './hooks';

const PHONE_BREAKPOINT = 768;
const DASHBOARD_DAILY_TASK_GOAL = 5;
const UI_THEME_STORAGE_KEY = 'myslime.ui.theme';

function App() {
  const { token, user, loading: authLoading, initializing, error: authError, isAuthenticated, submitAuth, logout, clearError } = useAuth();
  const { slimeData, error: slimeError, fetchSlimeData } = useSlimeData(token);
  const { overview: customizationOverview, refreshOverview: refreshCustomizationOverview } = useCustomization(token);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isFocusSessionLocked, setIsFocusSessionLocked] = useState(false);
  const [focusSystemWarning, setFocusSystemWarning] = useState<string | null>(null);
  const { isPhoneScreen, isSidebarCollapsed, toggleSidebar } = useResponsiveSidebar({
    phoneBreakpoint: PHONE_BREAKPOINT,
  });
  const { isGameboyTheme, toggleTheme } = useUiTheme({
    storageKey: UI_THEME_STORAGE_KEY,
  });
  const [, setStudyHealthSyncTick] = useState(0);
  const localStudyHealth = getStudyHealthSnapshot();
  const [devSettlementOverride, setDevSettlementOverride] = useState<{ studyHealth: StudyHealth; dayOffset: number } | null>(null);
  const { stats: dashboardTaskStats } = useDashboardTaskStats({
    token,
    dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
    enabled: activeTab === 'dashboard',
  });
  const isDevFeaturesEnabled = env.enableDevPanel;
  const activeSimulatedDayOffset = isDevFeaturesEnabled ? getSimulatedDayOffset() : 0;
  const shouldUseDevOverride =
    isDevFeaturesEnabled
    && activeSimulatedDayOffset !== 0
    && devSettlementOverride?.dayOffset === activeSimulatedDayOffset;
  const liveStudyHealth = slimeData?.studyHealth ?? null;
  const backendStudyHealth = shouldUseDevOverride
    ? devSettlementOverride?.studyHealth ?? null
    : liveStudyHealth;
  const effectiveStudyHealthPercentage = backendStudyHealth
    ? (backendStudyHealth.maxHp > 0 ? (backendStudyHealth.currentHp / backendStudyHealth.maxHp) * 100 : 0)
    : localStudyHealth.healthPercentage;
  const effectiveDailyGoalMinutes =
    liveStudyHealth?.dailyGoalMinutes
    ?? backendStudyHealth?.dailyGoalMinutes
    ?? localStudyHealth.targetDailyMinutes;
  const effectiveTodayFocusedMinutes =
    liveStudyHealth?.todayFocusedMinutes
    ?? backendStudyHealth?.todayFocusedMinutes
    ?? localStudyHealth.todayFocusedMinutes;
  const effectiveDayStreak = liveStudyHealth?.dayStreak ?? backendStudyHealth?.dayStreak ?? 0;

  const greeting = getGreetingByHour(new Date().getHours());
  const equippedColorGradient =
    customizationOverview?.catalog.find((item) => item.id === customizationOverview?.equippedBySlot?.color)?.previewGradient;
  const equippedColorImageSrc = getColorSkinAssetSrc(customizationOverview?.equippedBySlot?.color);

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
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === FOCUS_TIMER_STORAGE_KEY || event.key === FOCUS_SURVEY_STORAGE_KEY) {
        setStudyHealthSyncTick((currentTick) => currentTick + 1);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
        onToggleSidebar={toggleSidebar}
      />

      <main className={`main-content ${isFocusPage ? 'focus-main-content' : ''}`}>
        {!isFocusPage && (
          <>
            <AppHeader
              greeting={greeting}
              username={slimeData?.user.username?.split(' ')[0] || user?.username || 'Student'}
              onLogout={logout}
              isGameboyTheme={isGameboyTheme}
              onToggleTheme={toggleTheme}
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
                <StudyHealthDevPanel
                  token={token}
                  onAfterSettle={fetchSlimeData}
                  onSimulationUpdate={(result, dayOffset) => setDevSettlementOverride({ studyHealth: result, dayOffset })}
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
                <button type="button" className="btn-cta" onClick={toggleTheme}>
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
