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
  ConnectionAlert,
  getNextLevelXp,
  getSlimeXpPercentage,
  QuickStats,
  SlimeCompanionCard,
  updateSlimeName,
  type SidebarTab,
  type TabId,
  useSlimeData,
} from '../features/slime';
import { TasksBoard, useDashboardTaskStats } from '../features/tasks';
import { env } from '../shared/config/env';
import { parseApiErrorMessage } from '../shared/types/api';
import { AppFooterPanel } from './components/AppFooterPanel';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';

const DASHBOARD_DAILY_TASK_GOAL = 5;
const FOOTER_LINKEDIN_URL = 'https://www.linkedin.com/';

const getHeaderTitleByTab = (tab: TabId) => {
  switch (tab) {
    case 'dashboard':
      return 'Your Productivity Dashboard';
    case 'analytics':
      return 'Analytics';
    case 'leaderboard':
      return 'Leaderboard';
    case 'tasks':
      return 'Tasks';
    case 'achievements':
      return 'Achievements';
    case 'customize':
      return 'Customise';
    case 'settings':
      return 'Settings';
    default:
      return 'MySlime';
  }
};

function App() {
  const { token, user, loading: authLoading, initializing, error: authError, isAuthenticated, submitAuth, logout, clearError } = useAuth();
  const { slimeData, error: slimeError, fetchSlimeData } = useSlimeData(token);
  const { overview: customizationOverview, refreshOverview: refreshCustomizationOverview } = useCustomization(token);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isFocusSessionLocked, setIsFocusSessionLocked] = useState(false);
  const [focusSystemWarning, setFocusSystemWarning] = useState<string | null>(null);
  const [accountDeletionStatus, setAccountDeletionStatus] = useState<AccountDeletionStatusPayload | null>(null);
  const [settingsAction, setSettingsAction] = useState<'idle' | 'status' | 'export' | 'request' | 'cancel' | 'rename'>('idle');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [slimeNameDraft, setSlimeNameDraft] = useState('');
  const [isSlimeNameModalOpen, setIsSlimeNameModalOpen] = useState(false);
  const [isPrivacyControlsModalOpen, setIsPrivacyControlsModalOpen] = useState(false);
  const [isGdprModalOpen, setIsGdprModalOpen] = useState(false);
  const [, setStudyHealthSyncTick] = useState(0);
  const localStudyHealth = getStudyHealthSnapshot();
  const { stats: dashboardTaskStats } = useDashboardTaskStats({
    token,
    dailyGoal: DASHBOARD_DAILY_TASK_GOAL,
    enabled: activeTab === 'dashboard',
  });
  const isDevFeaturesEnabled = env.enableDevPanel;
  const liveStudyHealth = slimeData?.studyHealth ?? null;
  const backendStudyHealth = liveStudyHealth;
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

  const headerTitle = getHeaderTitleByTab(activeTab);
  const equippedColorGradient =
    customizationOverview?.catalog.find((item) => item.id === customizationOverview?.equippedBySlot?.color)?.previewGradient;
  const equippedColorImageSrc = getColorSkinAssetSrc(customizationOverview?.equippedBySlot?.color);
  const isSettingsBusy = settingsAction !== 'idle';
  const deletionStatusLabel = accountDeletionStatus?.status ?? 'none';
  const isDeletionPending = deletionStatusLabel === 'pending';
  const formatSettingsTimestamp = (value: string | null) => (value ? new Date(value).toLocaleString() : 'N/A');

  useEffect(() => {
    document.body.classList.add('theme-gameboy');
    return () => document.body.classList.remove('theme-gameboy');
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
    setSlimeNameDraft(slimeData?.name ?? '');
  }, [slimeData?.name]);

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
      const nextStatus = {
        status: result.data.status,
        requestedAt: result.data.requestedAt,
        scheduledPurgeAt: result.data.scheduledPurgeAt,
        cancelledAt: result.data.cancelledAt,
      };
      setAccountDeletionStatus(nextStatus);
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
      const nextStatus = {
        status: result.data.status,
        requestedAt: result.data.requestedAt,
        scheduledPurgeAt: result.data.scheduledPurgeAt,
        cancelledAt: result.data.cancelledAt,
      };
      setAccountDeletionStatus(nextStatus);
      setSettingsMessage(result.message ?? 'Account deletion request cancelled.');
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Failed to cancel account deletion request.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [token]);

  const handleRenameSlime = useCallback(async () => {
    if (!token) {
      return;
    }

    const nextName = slimeNameDraft.trim();
    const currentName = (slimeData?.name ?? '').trim();

    if (nextName.length < 2) {
      setSettingsError('Slime name must be at least 2 characters long.');
      setSettingsMessage(null);
      return;
    }

    if (nextName === currentName) {
      setSettingsMessage('Slime name is already up to date.');
      setSettingsError(null);
      setIsSlimeNameModalOpen(false);
      return;
    }

    setSettingsAction('rename');
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      await updateSlimeName(token, nextName);
      await fetchSlimeData();
      setSettingsMessage('Slime name updated successfully.');
      setIsSlimeNameModalOpen(false);
    } catch (error) {
      setSettingsError(parseApiErrorMessage(error, 'Failed to update slime name.'));
    } finally {
      setSettingsAction('idle');
    }
  }, [fetchSlimeData, slimeData?.name, slimeNameDraft, token]);

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
    { id: 'customize', name: 'Customise' },
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
      <div className="app-page">
        <div className="app">
          <main className="main-content">
            <section className="tasks-board">
              <p>Checking your session...</p>
            </section>
          </main>
        </div>
        <AppFooterPanel linkedinUrl={FOOTER_LINKEDIN_URL} />
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return (
      <div className="app-page">
        <div className="app">
          <main className="main-content">
            <AuthCard loading={authLoading} error={authError} onSubmit={submitAuth} onClearError={clearError} />
          </main>
        </div>
        <AppFooterPanel linkedinUrl={FOOTER_LINKEDIN_URL} />
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="app">
        <AppSidebar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <main className={`main-content ${isFocusPage ? 'focus-main-content' : ''}`}>
          {!isFocusPage && (
            <>
              <AppHeader
                title={headerTitle}
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
              customizationCatalog={customizationOverview?.catalog ?? []}
              equippedBySlot={customizationOverview?.equippedBySlot ?? {}}
            />
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
              <div className="settings-inline-header">
                <h4>Profile</h4>
              </div>
              <p className="focus-roadmap-note">Update your slime name and manage your current session.</p>
              <p className="focus-roadmap-note">Current slime name: {slimeData?.name ?? (slimeNameDraft || 'My Slime')}</p>
              {settingsMessage && <p className="settings-success-note">{settingsMessage}</p>}
              {settingsError && <p className="settings-error-note">{settingsError}</p>}
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-cta"
                  disabled={isSettingsBusy}
                  onClick={() => setIsSlimeNameModalOpen(true)}
                >
                  Change Slime Name
                </button>
                <button type="button" className="btn-refresh" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>

            {isSlimeNameModalOpen && (
              <div
                className="settings-status-modal-backdrop"
                role="presentation"
                onClick={() => setIsSlimeNameModalOpen(false)}
              >
                <div
                  className="settings-status-modal settings-slime-name-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Change slime name"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="settings-status-modal-header">
                    <h5>Change Slime Name</h5>
                    <button
                      type="button"
                      className="settings-status-modal-close settings-status-modal-close-icon"
                      onClick={() => setIsSlimeNameModalOpen(false)}
                      aria-label="Exit slime name popup"
                    >
                      X
                    </button>
                  </div>
                  <div className="settings-slime-name-modal-content">
                    <label className="tasks-field">
                      <span>Slime name</span>
                      <input
                        type="text"
                        value={slimeNameDraft}
                        maxLength={64}
                        onChange={(event) => setSlimeNameDraft(event.target.value)}
                        placeholder="Enter slime name"
                      />
                    </label>
                    {settingsError && <p className="settings-error-note">{settingsError}</p>}
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="btn-cta"
                        disabled={isSettingsBusy}
                        onClick={() => {
                          void handleRenameSlime();
                        }}
                      >
                        {settingsAction === 'rename' ? 'Saving Name...' : 'Save Slime Name'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="tasks-create-card">
              <div className="settings-inline-header">
                <h4>Privacy and Account Controls</h4>
              </div>
              <p className="focus-roadmap-note">Click to reveal account export and deletion lifecycle controls.</p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-refresh"
                  onClick={() => setIsPrivacyControlsModalOpen(true)}
                >
                  Open Controls
                </button>
              </div>
            </div>

            <div className="tasks-create-card">
              <div className="settings-inline-header">
                <h4>GDPR Information</h4>
              </div>
              <p className="focus-roadmap-note">Open GDPR compliance and data processing details.</p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-refresh"
                  onClick={() => setIsGdprModalOpen(true)}
                >
                  View GDPR Info
                </button>
              </div>
            </div>

            {isPrivacyControlsModalOpen && (
              <div
                className="settings-status-modal-backdrop"
                role="presentation"
                onClick={() => setIsPrivacyControlsModalOpen(false)}
              >
                <div
                  className="settings-status-modal settings-controls-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Privacy and account controls"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="settings-status-modal-header">
                    <h5>Privacy and Account Controls</h5>
                    <button
                      type="button"
                      className="settings-status-modal-close"
                      onClick={() => setIsPrivacyControlsModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="settings-controls-modal-content">
                    <div className="settings-status-inline-details">
                      <div className="settings-status-badges">
                        <span className="settings-status-badge">Deletion status: {deletionStatusLabel.toUpperCase()}</span>
                        {accountDeletionStatus?.requestedAt && (
                          <span className="settings-status-badge">Requested: {formatSettingsTimestamp(accountDeletionStatus.requestedAt)}</span>
                        )}
                        {accountDeletionStatus?.scheduledPurgeAt && (
                          <span className="settings-status-badge">Scheduled purge: {formatSettingsTimestamp(accountDeletionStatus.scheduledPurgeAt)}</span>
                        )}
                        {accountDeletionStatus?.cancelledAt && (
                          <span className="settings-status-badge">Cancelled: {formatSettingsTimestamp(accountDeletionStatus.cancelledAt)}</span>
                        )}
                      </div>

                      {isDeletionPending && (
                        <p className="settings-danger-note">
                          Your account will be permanently deleted on {formatSettingsTimestamp(accountDeletionStatus?.scheduledPurgeAt ?? null)}.
                          This action cannot be undone after that.
                        </p>
                      )}
                    </div>

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
                </div>
              </div>
            )}

            {isGdprModalOpen && (
              <div
                className="settings-status-modal-backdrop"
                role="presentation"
                onClick={() => setIsGdprModalOpen(false)}
              >
                <div
                  className="settings-status-modal settings-gdpr-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="GDPR compliance information"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="settings-status-modal-header">
                    <h5>GDPR Compliance and Data Processing Information</h5>
                    <button
                      type="button"
                      className="settings-status-modal-close"
                      onClick={() => setIsGdprModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="settings-gdpr-modal-content">
                    <p>
                      We value your privacy and are committed to protecting your personal data. In compliance with the
                      General Data Protection Regulation (GDPR), we would like to assure you that your personal data is not
                      processed in any way that violates your rights. We do not collect, store, or share any personal data
                      beyond what is necessary for the functioning of the service.
                    </p>
                    <p>
                      <strong>Data Usage:</strong> Any personal data that is provided is solely used to offer the services requested,
                      and we do not process or store any sensitive data without explicit consent.
                    </p>
                    <p>
                      <strong>Data Access:</strong> Only authorized personnel have access to your data, and we strictly limit access
                      to what is necessary for service delivery.
                    </p>
                    <p>
                      <strong>Third-Party Sharing:</strong> We do not share or sell your personal data to third parties. Any data shared
                      with third parties is done so in strict accordance with GDPR guidelines, and only when absolutely necessary.
                    </p>
                    <p>
                      <strong>Your Rights:</strong> Under GDPR, you have the right to access, correct, or delete your personal data at any time.
                      You may also withdraw consent if you no longer wish to participate.
                    </p>
                    <p>For any questions or requests regarding your data, please feel free to contact us.</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        </main>
      </div>
      <AppFooterPanel linkedinUrl={FOOTER_LINKEDIN_URL} />
    </div>
  );
}

export default App;
