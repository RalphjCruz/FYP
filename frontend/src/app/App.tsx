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
              <div className="settings-actions">
                <button type="button" className="btn-cta" onClick={toggleTheme}>
                  {isGameboyTheme ? 'Switch to Classic Theme' : 'Switch to Game Boy Theme'}
                </button>
              </div>
            </div>

            <div className="tasks-create-card">
              <h4>Privacy and Account Controls</h4>
              <p className="focus-roadmap-note">Manage account export and deletion lifecycle controls.</p>

              <div className="settings-status-badges">
                <span className="settings-status-badge">Deletion status: {deletionStatusLabel.toUpperCase()}</span>
                {accountDeletionStatus?.requestedAt && (
                  <span className="settings-status-badge">Requested: {formatSettingsTimestamp(accountDeletionStatus.requestedAt)}</span>
                )}
                {accountDeletionStatus?.scheduledPurgeAt && (
                  <span className="settings-status-badge">Scheduled purge: {formatSettingsTimestamp(accountDeletionStatus.scheduledPurgeAt)}</span>
                )}
              </div>

              {isDeletionPending && (
                <p className="settings-danger-note">
                  Your account will be permanently deleted on {formatSettingsTimestamp(accountDeletionStatus?.scheduledPurgeAt ?? null)}.
                  This action cannot be undone after that.
                </p>
              )}

              {settingsMessage && <p className="settings-success-note">{settingsMessage}</p>}
              {settingsError && <p className="settings-error-note">{settingsError}</p>}

              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-refresh"
                  disabled={isSettingsBusy}
                  onClick={() => {
                    void loadAccountDeletionStatus();
                  }}
                >
                  {settingsAction === 'status' ? 'Refreshing Status...' : 'Refresh Deletion Status'}
                </button>
                <button
                  type="button"
                  className="btn-cta"
                  disabled={isSettingsBusy}
                  onClick={() => {
                    void handleExportAccountData();
                  }}
                >
                  {settingsAction === 'export' ? 'Exporting...' : 'Export My Account Data (JSON)'}
                </button>
                <button
                  type="button"
                  className="btn-cta settings-danger-button"
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
                  className="btn-refresh"
                  disabled={isSettingsBusy || !isDeletionPending}
                  onClick={() => {
                    void handleCancelAccountDeletion();
                  }}
                >
                  {settingsAction === 'cancel' ? 'Cancelling Request...' : 'Cancel Deletion Request'}
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
