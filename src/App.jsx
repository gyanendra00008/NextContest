import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import Navbar from './Components/Navbar';
import HeroSection from './Components/HeroSection';
import PlatformSelector from './Components/PlatformSelector';
import Card from './Components/Card';
import Footer from './Components/Footer';
import { fetchPlatformData, fetchAllPlatforms } from './services/api';

function App() {
  const [activePlatform, setActivePlatform] = useState('All');
  const [activeStatus, setActiveStatus] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  
  const [data, setData] = useState({ upcoming: [], live: [], past: [] });
  const [allPlatformData, setAllPlatformData] = useState({ upcoming: [], live: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    let ignore = false;
    
    const fetchData = async () => {
      try {
        const fullData = await fetchAllPlatforms();
        if (ignore) return;
        setAllPlatformData(fullData);

        if (activePlatform === 'All') {
          setData(fullData);
        } else {
          const platformData = await fetchPlatformData(activePlatform);
          if (ignore) return;
          setData(platformData);
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
      {/* Navigation Bar */}
      <Navbar 
        onRefresh={() => loadData(true)} 
        isRefreshing={isRefreshing} 
      />

      <main className="main-content">
        {/* Hero Section */}
        <HeroSection 
          stats={stats} 
          onScrollToContests={handleScrollToContests} 
        />

        {/* Filter and Search Panel */}
        <div id="contests-main-view">
          <PlatformSelector
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
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
      </main>

      {/* Modern Footer */}
      <Footer />
    </div>
  );
}

export default App;
