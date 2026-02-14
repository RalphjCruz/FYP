import { useEffect, useState } from 'react';
import './App.css';
import { type SidebarTab, type TabId } from '../features/slime/components/SidebarNav';
import type { SlimeData } from '../features/slime/types';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { QuickStats } from '../features/slime/components/QuickStats';
import { SystemStatus } from '../features/slime/components/SystemStatus';
import { ConnectionAlert } from '../features/slime/components/ConnectionAlert';
import { SlimeCompanionCard } from '../features/slime/components/SlimeCompanionCard';
import { ActivityFeed } from '../features/slime/components/ActivityFeed';

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

        <ConnectionAlert error={error} onCreateAccount={createTestUser} />

        <QuickStats slimeData={slimeData} />

        <div className="content-grid">
          <SlimeCompanionCard
            slimeData={slimeData}
            xpPercentage={getXPPercentage()}
            nextLevelXP={getNextLevelXP()}
          />
          <ActivityFeed />
        </div>

        <SystemStatus slimeData={slimeData} />
      </main>
    </div>
  );
}

export default App;
