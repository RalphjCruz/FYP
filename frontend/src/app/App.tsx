import { useState, useEffect } from 'react';
import './App.css';

interface SlimeData {
  id: number;
  name: string;
  level: number;
  experience: number;
  color: string;
  evolutionStage: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

function App() {
  const [slimeData, setSlimeData] = useState<SlimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'focus' | 'tasks'>('dashboard');
  const [greeting, setGreeting] = useState('');

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
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
        method: 'POST'
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

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'focus', name: 'Focus Session', icon: '⏱️' },
    { id: 'tasks', name: 'Tasks', icon: '✓' }
  ] as const;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="slime-icon-mini">
            <div className="mini-slime"></div>
          </div>
          <div>
            <h1>MySlime</h1>
            <p className="tagline">Level up your productivity</p>
          </div>
        </div>
        
        <nav className="nav">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="icon">{tab.icon}</span>
              <span className="nav-text">{tab.name}</span>
              {activeTab === tab.id && <div className="active-indicator"></div>}
            </button>
          ))}
          
          <div className="nav-divider"></div>
          
          <button className="nav-item secondary">
            <span className="icon">📈</span>
            <span className="nav-text">Analytics</span>
          </button>
          <button className="nav-item secondary">
            <span className="icon">🏆</span>
            <span className="nav-text">Achievements</span>
          </button>
          <button className="nav-item secondary">
            <span className="icon">🎨</span>
            <span className="nav-text">Customize</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar-container">
              <div className="avatar">
                <span>{slimeData?.user.username?.[0] || 'U'}</span>
              </div>
              <div className="status-dot"></div>
            </div>
            <div className="user-details">
              <div className="user-name">{slimeData?.user.username || 'Loading...'}</div>
              <div className="user-level">Level {slimeData?.level || 1} Student</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div className="header-content">
            <div>
              <div className="greeting">{greeting}, {slimeData?.user.username?.split(' ')[0] || 'Student'}! 👋</div>
              <h2 className="page-title">Your Productivity Dashboard</h2>
            </div>
            <div className="header-actions">
              <button className="btn-icon" title="Notifications">
                🔔
                <span className="badge">3</span>
              </button>
              <button className="btn-refresh" onClick={fetchSlimeData} disabled={loading}>
                <span className="refresh-icon">{loading ? '⏳' : '🔄'}</span>
                {loading ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
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

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-card highlight">
            <div className="stat-header">
              <div className="stat-icon-circle today">⏱️</div>
              <div className="stat-badge">Today</div>
            </div>
            <div className="stat-body">
              <div className="stat-value">0h 00m</div>
              <div className="stat-label">Focus Time</div>
              <div className="stat-progress">
                <div className="progress-mini">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
                <span className="progress-text">0% of 4h goal</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-circle xp">⭐</div>
              <div className="stat-change positive">+0 today</div>
            </div>
            <div className="stat-body">
              <div className="stat-value">{slimeData?.experience || 0}</div>
              <div className="stat-label">Total XP</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-circle tasks">✓</div>
              <div className="stat-change">0/5 today</div>
            </div>
            <div className="stat-body">
              <div className="stat-value">0</div>
              <div className="stat-label">Tasks Done</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-circle streak">🔥</div>
              <div className="stat-badge premium">Premium</div>
            </div>
            <div className="stat-body">
              <div className="stat-value">0</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="content-grid">
          {/* Slime Card */}
          <div className="slime-section">
            <div className="section-header">
              <h3>Your Companion</h3>
              <button className="btn-text">Customize →</button>
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
                    <span className="xp-numbers">{slimeData?.experience || 0} / {getNextLevelXP()}</span>
                  </div>
                  <div className="xp-bar-modern">
                    <div 
                      className="xp-fill-modern" 
                      style={{ width: `${getXPPercentage()}%` }}
                    >
                      <div className="xp-shine"></div>
                    </div>
                  </div>
                  <div className="xp-footer">
                    <span>{Math.round(getXPPercentage())}% to next level</span>
                  </div>
                </div>

                <button className="btn-cta">
                  <span className="btn-icon">🎯</span>
                  Start Focus Session
                  <span className="btn-shine"></span>
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="activity-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
              <button className="btn-text">View all →</button>
            </div>
            
            <div className="activity-feed">
              <div className="activity-empty">
                <div className="empty-icon">📊</div>
                <div className="empty-text">No activity yet</div>
                <div className="empty-subtext">Complete a focus session to get started!</div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="system-status">
          <div className="status-header">
            <span className="status-title">🗄️ System Status</span>
            <span className="status-time">Last checked: just now</span>
          </div>
          <div className="status-items">
            <div className="status-item">
              <div className={`status-dot ${slimeData ? 'success' : 'warning'}`}></div>
              <span>Database</span>
              <span className="status-value">
                {slimeData ? `✓ Connected (User #${slimeData.user.id})` : '⏳ Connecting...'}
              </span>
            </div>
            <div className="status-item">
              <div className="status-dot success"></div>
              <span>Backend API</span>
              <span className="status-value">✓ Online</span>
            </div>
            <div className="status-item">
              <div className="status-dot success"></div>
              <span>Frontend</span>
              <span className="status-value">✓ Loaded</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;