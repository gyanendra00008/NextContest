import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import Navbar from './Components/Navbar';
import HeroSection from './Components/HeroSection';
import PlatformSelector from './Components/PlatformSelector';
import Card from './Components/Card';
import Footer from './Components/Footer';
import AiContestView from './Components/AiContest/AiContestView';
import { fetchPlatformData, fetchAllPlatforms } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#ai-contest' || window.location.pathname.includes('ai-contest'))) {
      return 'ai-contest';
    }
    return 'contests';
  });
  const [activePlatform, setActivePlatform] = useState('All');
  const [activeStatus, setActiveStatus] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  
  const [data, setData] = useState({ upcoming: [], live: [], past: [] });
  const [allPlatformData, setAllPlatformData] = useState({ upcoming: [], live: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      window.location.hash = newTab === 'ai-contest' ? '#ai-contest' : '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#ai-contest') {
        setActiveTab('ai-contest');
      } else {
        setActiveTab('contests');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load contest data
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Always fetch all data in background to calculate counts
      const fullData = await fetchAllPlatforms();
      setAllPlatformData(fullData);

      if (activePlatform === 'All') {
        setData(fullData);
      } else {
        const platformData = await fetchPlatformData(activePlatform);
        setData(platformData);
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
      setError('Could not connect to contest servers. Please ensure the backend is running or check internet connectivity.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activePlatform]);

  // Handle platform switch with immediate circular loading state
  const handleSelectPlatform = useCallback((platformId) => {
    setActivePlatform((prev) => {
      if (prev === platformId) return prev;
      setLoading(true);
      return platformId;
    });
  }, []);

  useEffect(() => {
    let ignore = false;
    
    const fetchData = async () => {
      const startTime = Date.now();
      setError(null);

      try {
        if (activePlatform === 'All') {
          const fullData = await fetchAllPlatforms();
          if (ignore) return;
          setAllPlatformData(fullData);
          setData(fullData);
        } else {
          // Fetch selected platform data
          const platformData = await fetchPlatformData(activePlatform);
          if (ignore) return;
          setData(platformData);

          // Update full platform counts in background
          fetchAllPlatforms().then(fullData => {
            if (!ignore && fullData) setAllPlatformData(fullData);
          }).catch(() => {});
        }

        // Smooth UX: allow circle animation to render gracefully (min 250ms)
        const elapsed = Date.now() - startTime;
        if (elapsed < 250) {
          await new Promise(r => setTimeout(r, 250 - elapsed));
        }
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load contests:', err);
        setError('Could not connect to contest servers. Please ensure the backend is running or check internet connectivity.');
      } finally {
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [activePlatform]);

  // Compute platform and status counts
  const counts = useMemo(() => {
    const totalUpcoming = allPlatformData.upcoming?.length || 0;

    const lcCount = (allPlatformData.upcoming || []).filter(c => c.platform === 'LeetCode').length;
    const cfCount = (allPlatformData.upcoming || []).filter(c => c.platform === 'Codeforces').length;
    const ccCount = (allPlatformData.upcoming || []).filter(c => c.platform === 'CodeChef').length;
    const atCount = (allPlatformData.upcoming || []).filter(c => c.platform === 'AtCoder').length;

    // Platform-specific status counts
    const currentList = activePlatform === 'All' ? allPlatformData : data;
    const upcomingForPlatform = currentList.upcoming?.length || 0;
    const liveForPlatform = currentList.live?.length || 0;
    const pastForPlatform = currentList.past?.length || 0;

    return {
      All: totalUpcoming,
      Leetcode: lcCount,
      Codeforces: cfCount,
      Codechef: ccCount,
      Atcoder: atCount,
      upcoming: upcomingForPlatform,
      live: liveForPlatform,
      past: pastForPlatform,
    };
  }, [allPlatformData, data, activePlatform]);

  // Filter contests based on active status and search query
  const filteredContests = useMemo(() => {
    const list = data[activeStatus] || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.platform?.toLowerCase().includes(q)
    );
  }, [data, activeStatus, searchQuery]);

  const stats = {
    upcomingCount: allPlatformData.upcoming?.length || 0,
    liveCount: allPlatformData.live?.length || 0,
  };

  const handleScrollToContests = () => {
    const el = document.getElementById('contests-main-view');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="app-root">
      {/* Navigation Bar with Tab Switcher */}
      <Navbar 
        onRefresh={() => loadData(true)} 
        isRefreshing={isRefreshing}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      <main className="main-content">
        {activeTab === 'contests' ? (
          <>
            {/* Hero Section */}
            <HeroSection 
              stats={stats} 
              onScrollToContests={handleScrollToContests}
              onNavigateToAiContest={() => handleTabChange('ai-contest')}
            />

            {/* Filter and Search Panel */}
            <div id="contests-main-view">
              <PlatformSelector
                activePlatform={activePlatform}
                setActivePlatform={handleSelectPlatform}
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                counts={counts}
              />

              {/* Contests Display (Cards or Table) */}
              <Card
                contests={filteredContests}
                loading={loading}
                error={error}
                viewMode={viewMode}
                onRetry={() => loadData(false)}
                activeStatus={activeStatus}
                searchQuery={searchQuery}
                platform={activePlatform}
              />
            </div>
          </>
        ) : (
          /* AI Personalized Contest View */
          <AiContestView />
        )}
      </main>

      {/* Modern Footer */}
      <Footer />
    </div>
  );
}

export default App;
