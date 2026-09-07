import './HeroSection.css';
import { Trophy, Flame, CalendarCheck, ChevronDown, Sparkles } from 'lucide-react';

const HeroSection = ({ stats, onScrollToContests, onNavigateToAiContest }) => {
  return (
    <section className="hero-container">
      <div className="hero-content">
        {/* Technical Label Pill */}
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          <span className="hero-badge-text">COMPETITIVE PROGRAMMING PLATFORM</span>
        </div>

        {/* Strong Minimalist Headline */}
        <h1 className="hero-title">
          Find contests.<br />
          Train smarter.<br />
          <span className="hero-title-highlight">Compete better.</span>
        </h1>

        {/* Clean Editorial Subtitle */}
        <p className="hero-description">
          Real-time schedule for <strong>LeetCode</strong>, <strong>Codeforces</strong>, <strong>CodeChef</strong>, and <strong>AtCoder</strong>. Synchronized to your local timezone with live countdowns, calendar sync, and adaptive training.
        </p>

        {/* High-Contrast Action CTAs */}
        <div className="hero-cta-group">
          {onScrollToContests && (
            <button className="hero-btn primary" onClick={onScrollToContests}>
              <span>Explore Contests</span>
              <ChevronDown size={15} />
            </button>
          )}

          {onNavigateToAiContest && (
            <button className="hero-btn secondary" onClick={onNavigateToAiContest}>
              <Sparkles size={14} className="hero-btn-icon" />
              <span>Try AI Contest</span>
            </button>
          )}
        </div>

        {/* Minimalist Stats Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card" onClick={onScrollToContests} role="button" tabIndex={0}>
            <div className="stat-icon-wrap upcoming">
              <Trophy size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.upcomingCount ?? '—'}</span>
              <span className="stat-label">Upcoming Contests</span>
            </div>
          </div>

          <div className="stat-card" onClick={onScrollToContests} role="button" tabIndex={0}>
            <div className="stat-icon-wrap live">
              <Flame size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.liveCount ?? '0'}</span>
              <span className="stat-label">Live Ongoing</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap platforms">
              <CalendarCheck size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-value">4 Platforms</span>
              <span className="stat-label">Auto-Synchronized</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
