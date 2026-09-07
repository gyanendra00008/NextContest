import { useState, useEffect } from 'react';
import './Navbar.css';
import { getUserTimeZone } from '../utils/timeUtils';
import { Clock, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { GithubIcon } from './Icons';
import ThemeSwitcher from './ThemeSwitcher';

const Navbar = ({ onRefresh, isRefreshing, activeTab = 'contests', setActiveTab }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [timeZoneStr] = useState(() => getUserTimeZone());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand / Logo */}
        <div className="navbar-brand" onClick={() => setActiveTab?.('contests')} style={{ cursor: 'pointer' }}>
          <div className="logo-badge">
            <img 
              src="/Mylogo.png" 
              alt="NextContest Logo" 
              className="logo-img" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <span className="logo-icon-fallback">⚡</span>
          </div>
          <div className="brand-text-wrapper">
            <div className="brand-title-row">
              <h1 className="brand-title">Next<span className="brand-title-suffix">Contest</span></h1>
              <span className="version-pill">v2.0</span>
            </div>
            <div className="live-status-indicator">
              <span className="pulse-dot"></span>
              <span className="live-text">Live Sync</span>
            </div>
          </div>
        </div>

        {/* Central Feature Switcher */}
        {setActiveTab && (
          <nav className="navbar-nav-links" aria-label="Main Navigation">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'contests' ? 'active' : ''}`}
              onClick={() => setActiveTab('contests')}
            >
              <Trophy size={14} />
              <span>Contests</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ai-tab ${activeTab === 'ai-contest' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-contest')}
            >
              <Sparkles size={14} />
              <span>AI Contest</span>
              <span className="ai-nav-tag">AI</span>
            </button>
          </nav>
        )}

        {/* Live User Time Widget */}
        {/* <div className="time-widget" title={`Local Timezone: ${timeZoneStr}`}>
          <Clock className="time-icon" size={15} />
          <span className="time-display">{formattedTime}</span>
          <span className="timezone-badge">{timeZoneStr.split(' ')[0]}</span>
        </div> */}

        {/* Action Controls: Theme Switcher, Sync, Star */}
        <div className="navbar-actions">
          <ThemeSwitcher />

          {onRefresh && (
            <button 
              className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={onRefresh}
              title="Refresh contests data"
              aria-label="Refresh contests"
            >
              <RefreshCw size={15} />
              <span className="refresh-label">Sync</span>
            </button>
          )}

          <a 
            href="https://github.com/gyanendra00008/NextContest" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="github-link"
            title="View Source on GitHub"
          >
            <GithubIcon size={16} />
            <span className="github-label">Star</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
