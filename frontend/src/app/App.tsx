import { useEffect, useState } from 'react';
import './App.css';
import { type SidebarTab, type TabId } from '../features/slime/components/SidebarNav';
import type { SlimeData } from '../features/slime/types';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { QuickStats } from '../features/slime/components/QuickStats';
import { SystemStatus } from '../features/slime/components/SystemStatus';

const PHONE_BREAKPOINT = 768;

function App() {
  const [slimeData, setSlimeData] = useState<SlimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [greeting, setGreeting] = useState('');
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= PHONE_BREAKPOINT);

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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

  const fetchSlimeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/slime/1`);
      const data = await response.json();

      if (data.success) {
        setSlimeData(data.data);
      } else {
        setError(data.message || 'Failed to fetch slime data');
      }
    } catch (err) {
      setError('Cannot connect to backend. Make sure the server is running!');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTestUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/slime/test-user`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        await fetchSlimeData();
      } else {
        setError(data.message || 'Failed to create test user');
      }
    } catch (err) {
      setError('Cannot connect to backend. Make sure the server is running!');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlimeData();
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

        {error && (
          <div className="alert alert-error">
            <div className="alert-content">
              <span className="alert-icon">{`\u{26A0}\u{FE0F}`}</span>
              <div>
                <div className="alert-title">Connection Issue</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
            {error.includes('not found') && (
              <button className="btn-small" onClick={createTestUser}>
                Create Account
              </button>
            )}
          </div>
        )}

        <QuickStats slimeData={slimeData} />

        <div className="content-grid">
          <div className="slime-section">
            <div className="section-header">
              <h3>Your Companion</h3>
              <button className="btn-text">Customize {'\u{2192}'}</button>
            </div>

            <div className="slime-card-modern">
              <div className="slime-stage">
                <div className="stage-indicator">Stage {slimeData?.evolutionStage || 1}</div>
                <div className="slime-display-modern">
                  <div className="slime-glow"></div>
                  <div className={`slime slime-${slimeData?.color || 'green'}`}>
                    <div className="slime-body"></div>
                    <div className="slime-eyes">
                      <div className="eye"></div>
                      <div className="eye"></div>
                    </div>
                    <div className="slime-mouth"></div>
                  </div>
                  <div className="slime-shadow"></div>
                </div>
                <div className="slime-name">{slimeData?.name || 'Your Slime'}</div>
              </div>

              <div className="slime-stats">
                <div className="level-badge">
                  <span className="level-number">{slimeData?.level || 1}</span>
                  <span className="level-text">Level</span>
                </div>

                <div className="xp-section">
                  <div className="xp-header">
                    <span className="xp-label">Experience Points</span>
                    <span className="xp-numbers">
                      {slimeData?.experience || 0} / {getNextLevelXP()}
                    </span>
                  </div>
                  <div className="xp-bar-modern">
                    <div className="xp-fill-modern" style={{ width: `${getXPPercentage()}%` }}>
                      <div className="xp-shine"></div>
                    </div>
                  </div>
                  <div className="xp-footer">
                    <span>{Math.round(getXPPercentage())}% to next level</span>
                  </div>
                </div>

                <button className="btn-cta">
                  <span className="btn-icon">{'\u{1F3AF}'}</span>
                  Start Focus Session
                  <span className="btn-shine"></span>
                </button>
              </div>
            </div>
          </div>

          <div className="activity-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
              <button className="btn-text">View all {'\u{2192}'}</button>
            </div>

            <div className="activity-feed">
              <div className="activity-empty">
                <div className="empty-icon">{'\u{1F4CA}'}</div>
                <div className="empty-text">No activity yet</div>
                <div className="empty-subtext">Complete a focus session to get started!</div>
              </div>
            </div>
          </div>
        </div>

        <SystemStatus slimeData={slimeData} />
      </main>
    </div>
  );
}

export default App;
