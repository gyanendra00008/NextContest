import './HeroSection.css';
import { Trophy, Flame, CalendarCheck, Sparkles, ChevronDown } from 'lucide-react';

const HeroSection = ({ stats, onScrollToContests }) => {
  return (
    <section className="hero-container">
      <div className="hero-content">
        {/* Sub-badge */}
        <div className="hero-badge">
          <Sparkles size={14} className="hero-badge-icon" />
          <span>REAL-TIME COMPETITIVE PROGRAMMING HUB</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          All Your Coding Contests.<br />
          <span className="gradient-text">Accurate Time. Zero Hassle.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-description">
          Track upcoming & ongoing contests across <strong>LeetCode</strong>, <strong>Codeforces</strong>, and <strong>CodeChef</strong>. Synchronized in your local timezone with live countdowns and 1-click Google Calendar integration.
        </p>

        {/* Quick Stats Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card" onClick={onScrollToContests} role="button" tabIndex={0}>
            <div className="stat-icon-wrap upcoming">
              <Trophy size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.upcomingCount ?? '—'}</span>
              <span className="stat-label">Upcoming Contests</span>
            </div>
          </div>

          <div className="stat-card" onClick={onScrollToContests} role="button" tabIndex={0}>
            <div className="stat-icon-wrap live">
              <Flame size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.liveCount ?? '0'}</span>
              <span className="stat-label">Live / Ongoing</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap platforms">
              <CalendarCheck size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">3 Platforms</span>
              <span className="stat-label">Auto-Synchronized</span>
            </div>
          </div>
        </div>

        {onScrollToContests && (
          <button className="hero-scroll-btn" onClick={onScrollToContests}>
            <span>View All Contests</span>
            <ChevronDown size={16} />
          </button>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
