import { useCallback, useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './App.css';
import '../features/focus/styles.css';
import '../features/customization/styles.css';
import './styles/consistency.css';
import { AnalyticsBoard } from '../features/analytics';
import {
  AuthCard,
  cancelAccountDeletionAction,
  exportAccountData,
  getAccountDeletionStatus,
  requestAccountDeletionAction,
  type AccountDeletionStatusPayload,
  useAuth,
} from '../features/auth';
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
import { parseApiErrorMessage } from '../shared/types/api';
import { AppHeader } from './components/AppHeader';
import { GameBoyFrame, ScreenContainer } from './components/layout';
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
  const [accountDeletionStatus, setAccountDeletionStatus] = useState<AccountDeletionStatusPayload | null>(null);
  const [settingsAction, setSettingsAction] = useState<'idle' | 'status' | 'export' | 'request' | 'cancel'>('idle');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isGdprInfoVisible, setIsGdprInfoVisible] = useState(false);
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
  const isSettingsBusy = settingsAction !== 'idle';
  const deletionStatusLabel = accountDeletionStatus?.status ?? 'none';
  const isDeletionPending = deletionStatusLabel === 'pending';
  const formatSettingsTimestamp = (value: string | null) => (value ? new Date(value).toLocaleString() : 'N/A');

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

  const loadAccountDeletionStatus = useCallback(async () => {
    if (!token) {
      return;
    }

    setSettingsAction('status');
    setSettingsError(null);

    try {
      const status = await getAccountDeletionStatus(token);
      setAccountDeletionStatus(status);
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Could not refresh account deletion status.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [token]);

  const handleExportAccountData = useCallback(async () => {
    if (!token) {
      return;
    }

    setSettingsAction('export');
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      const data = await exportAccountData(token);
      const fileName = `myslime-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSettingsMessage('Account export downloaded as structured JSON.');
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Failed to export account data.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [token]);

  const handleRequestAccountDeletion = useCallback(async () => {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      'Your account will be permanently deleted in 7 days if not cancelled. This action cannot be undone after that. Continue?',
    );
    if (!confirmed) {
      return;
    }

    setSettingsAction('request');
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      const result = await requestAccountDeletionAction(token);
      setAccountDeletionStatus({
        status: result.data.status,
        requestedAt: result.data.requestedAt,
        scheduledPurgeAt: result.data.scheduledPurgeAt,
        cancelledAt: result.data.cancelledAt,
      });
      setSettingsMessage(result.message ?? 'Account deletion requested successfully.');
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Failed to request account deletion.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [token]);

  const handleCancelAccountDeletion = useCallback(async () => {
    if (!token) {
      return;
    }

    const confirmed = window.confirm('Cancel your pending account deletion request?');
    if (!confirmed) {
      return;
    }

    setSettingsAction('cancel');
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      const result = await cancelAccountDeletionAction(token);
      setAccountDeletionStatus({
        status: result.data.status,
        requestedAt: result.data.requestedAt,
        scheduledPurgeAt: result.data.scheduledPurgeAt,
        cancelledAt: result.data.cancelledAt,
      });
      setSettingsMessage(result.message ?? 'Account deletion request cancelled.');
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Failed to cancel account deletion request.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'settings' || !token) {
      return;
    }

    void loadAccountDeletionStatus();
  }, [activeTab, loadAccountDeletionStatus, token]);

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
      <GameBoyFrame className="min-h-[calc(100vh-2rem)]">
        <ScreenContainer title="MySlime" subtitle="Checking your session...">
          <section className="gb-section-card">
            <p className="gb-body text-base sm:text-lg">Please wait while we restore your account.</p>
          </section>
        </ScreenContainer>
      </GameBoyFrame>
    );
  }

  if (!isAuthenticated || !token) {
    return (
      <GameBoyFrame className="min-h-[calc(100vh-2rem)]">
        <ScreenContainer
          title="MySlime"
          subtitle="Gamified productivity that helps you level up through focused study and completed tasks."
        >
          <AuthCard loading={authLoading} error={authError} onSubmit={submitAuth} onClearError={clearError} />
        </ScreenContainer>
      </GameBoyFrame>
    );
  }

  return (
    <GameBoyFrame className="min-h-[calc(100vh-2rem)]">
      <section className="w-full">
        <div className="grid gap-4 md:grid-cols-[auto,minmax(0,1fr)] md:items-start">
          <AppSidebar
            slimeData={slimeData}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isSidebarCollapsed={isSidebarCollapsed}
            isPhoneScreen={isPhoneScreen}
            onToggleSidebar={toggleSidebar}
          />

          <main className={`min-w-0 ${isFocusPage ? '' : 'space-y-4'}`}>
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
              <section className="gb-section-card space-y-4" aria-label="Settings">
                <header>
                  <h3 className="font-display text-xl leading-relaxed text-gb-text sm:text-2xl">Settings</h3>
                  <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">Application preferences and account controls.</p>
                </header>

                <article className="rounded-xl border-2 border-gb-border bg-gb-panel/80 p-4">
                  <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Appearance</h4>
                  <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">
                    Current theme: {isGameboyTheme ? 'Game Boy' : 'Classic'}
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                      onClick={toggleTheme}
                    >
                      {isGameboyTheme ? 'Switch to Classic Theme' : 'Switch to Game Boy Theme'}
                    </button>
                  </div>
                </article>

                <article className="rounded-xl border-2 border-gb-border bg-gb-panel/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Privacy and Account Controls</h4>
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px sm:text-lg"
                      onClick={() => setIsGdprInfoVisible((current) => !current)}
                    >
                      {isGdprInfoVisible ? 'Hide GDPR Info' : 'GDPR Info'}
                    </button>
                  </div>

                  <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">
                    Manage account export and deletion lifecycle controls.
                  </p>

                  {isGdprInfoVisible && (
                    <div
                      className="mt-4 space-y-2 rounded-lg border-2 border-gb-border bg-gb-bg p-3 font-sans text-base leading-relaxed text-gb-text sm:text-lg"
                      role="note"
                      aria-label="GDPR information"
                    >
                      <p><strong>Data export:</strong> You can download your account data as structured JSON.</p>
                      <p><strong>Deletion lifecycle:</strong> Deletion requests enter a grace period and can be cancelled while pending.</p>
                      <p><strong>Purge timing:</strong> Once requested, the scheduled permanent purge time is shown in this section.</p>
                      <p><strong>Account scope:</strong> These actions only apply to the currently authenticated account.</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-sm font-semibold text-gb-text sm:text-base">
                      Deletion status: {deletionStatusLabel.toUpperCase()}
                    </span>
                    {accountDeletionStatus?.requestedAt && (
                      <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-sm font-semibold text-gb-text sm:text-base">
                        Requested: {formatSettingsTimestamp(accountDeletionStatus.requestedAt)}
                      </span>
                    )}
                    {accountDeletionStatus?.scheduledPurgeAt && (
                      <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-sm font-semibold text-gb-text sm:text-base">
                        Scheduled purge: {formatSettingsTimestamp(accountDeletionStatus.scheduledPurgeAt)}
                      </span>
                    )}
                  </div>

                  {isDeletionPending && (
                    <p className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-3 font-sans text-base leading-relaxed text-[#4d1212] sm:text-lg">
                      Your account will be permanently deleted on {formatSettingsTimestamp(accountDeletionStatus?.scheduledPurgeAt ?? null)}.
                      This action cannot be undone after that.
                    </p>
                  )}

                  {settingsMessage && (
                    <p className="mt-4 rounded-lg border-2 border-[#2f5e2f] bg-[#3b7f3b]/20 p-3 font-sans text-base text-[#153015] sm:text-lg">
                      {settingsMessage}
                    </p>
                  )}
                  {settingsError && (
                    <p className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-3 font-sans text-base text-[#4d1212] sm:text-lg">
                      {settingsError}
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                      disabled={isSettingsBusy}
                      onClick={() => {
                        void loadAccountDeletionStatus();
                      }}
                    >
                      {settingsAction === 'status' ? 'Refreshing Status...' : 'Refresh Deletion Status'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                      disabled={isSettingsBusy}
                      onClick={() => {
                        void handleExportAccountData();
                      }}
                    >
                      {settingsAction === 'export' ? 'Exporting...' : 'Export My Account Data (JSON)'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gb-border bg-[#b2473e] px-4 py-3 font-sans text-base font-semibold text-white transition hover:bg-[#9e3a33] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                      disabled={isSettingsBusy || isDeletionPending}
                      onClick={() => {
                        void handleRequestAccountDeletion();
                      }}
                    >
                      {settingsAction === 'request'
                        ? 'Submitting Deletion Request...'
                        : isDeletionPending
                          ? 'Deletion Request Pending'
                          : 'Request Account Deletion'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                      disabled={isSettingsBusy || !isDeletionPending}
                      onClick={() => {
                        void handleCancelAccountDeletion();
                      }}
                    >
                      {settingsAction === 'cancel' ? 'Cancelling Request...' : 'Cancel Deletion Request'}
                    </button>
                  </div>
                </article>
              </section>
            )}
          </main>
        </div>
      </section>
    </GameBoyFrame>
  );
}

export default App;
