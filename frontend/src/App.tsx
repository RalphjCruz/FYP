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

  const API_URL = 'http://localhost:3000';

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
        alert('Test user created! Now fetching slime data...');
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

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="slime-icon">🎮</div>
          <h1>MySlime</h1>
        </div>
        
        <nav className="nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="icon">📊</span>
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'focus' ? 'active' : ''}`}
            onClick={() => setActiveTab('focus')}
          >
            <span className="icon">⏱️</span>
            Focus Session
          </button>
          <button 
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <span className="icon">✓</span>
            Tasks
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">👤</div>
            <div>
              <div className="user-name">{slimeData?.user.username || 'Loading...'}</div>
              <div className="user-email">{slimeData?.user.email || '...'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <h2>Dashboard</h2>
            <p className="subtitle">Track your focus, grow your slime, and level up your discipline.</p>
          </div>
          <button className="btn-refresh" onClick={fetchSlimeData} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            {error.includes('not found') && (
              <button className="btn-small" onClick={createTestUser}>
                Create Test User
              </button>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">Today's Focus</div>
              <div className="stat-value">0m 00s</div>
              <div className="stat-subtitle">Total focused time completed today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-label">Total XP</div>
              <div className="stat-value">{slimeData?.experience || 0}</div>
              <div className="stat-subtitle">XP earned</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <div className="stat-label">Tasks Completed</div>
              <div className="stat-value">0</div>
              <div className="stat-subtitle">Keep it up!</div>
            </div>
          </div>
        </div>

        {/* Slime Display */}
        <div className="slime-container">
          <div className="slime-card">
            <div className="slime-display">
              <div className={`slime slime-${slimeData?.color || 'green'}`}>
                <div className="slime-body"></div>
                <div className="slime-eyes">
                  <div className="eye"></div>
                  <div className="eye"></div>
                </div>
                <div className="slime-mouth"></div>
              </div>
            </div>
            
            <div className="slime-info">
              <h3>{slimeData?.name || 'Your Slime'}</h3>
              <div className="slime-level">Level {slimeData?.level || 1} Slime</div>
              <p className="slime-description">Your slime evolves as you focus.</p>
              
              <div className="xp-bar">
                <div className="xp-label">
                  <span>XP</span>
                  <span>{slimeData?.experience || 0} / {(slimeData?.level || 1) * 100}</span>
                </div>
                <div className="xp-track">
                  <div 
                    className="xp-fill" 
                    style={{ width: `${getXPPercentage()}%` }}
                  ></div>
                </div>
              </div>

              <button className="btn-primary">Start Focus Session</button>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="database-status">
          <h4>🗄️ Database Connection Status</h4>
          {slimeData ? (
            <div className="status-success">
              ✅ Connected to PostgreSQL - User ID: {slimeData.user.id}
            </div>
          ) : (
            <div className="status-pending">
              ⏳ Waiting for database connection...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;