import { useState, useEffect } from 'react';
import './ContestCard.css';
import { 
  formatDateTime, 
  formatDuration, 
  getCountdown, 
  getGoogleCalendarUrl 
} from '../utils/timeUtils';
import { Calendar, Clock, ExternalLink, Timer, CalendarPlus } from 'lucide-react';

const PLATFORM_CONFIG = {
  LeetCode: {
    badgeClass: 'leetcode',
    icon: '🟡',
    color: '#f59e0b',
  },
  Codeforces: {
    badgeClass: 'codeforces',
    icon: '🟢',
    color: '#38bdf8',
  },
  CodeChef: {
    badgeClass: 'codechef',
    icon: '🔴',
    color: '#a855f7',
  },
  AtCoder: {
    badgeClass: 'atcoder',
    icon: '⚫',
    color: '#10b981',
  }
};

const ContestCard = ({ contest }) => {
  const [countdown, setCountdown] = useState(() => 
    getCountdown(contest.startTime, contest.duration)
  );

  useEffect(() => {
    // Update ticker every second for upcoming or live contests
    const timer = setInterval(() => {
      setCountdown(getCountdown(contest.startTime, contest.duration));
    }, 1000);

    return () => clearInterval(timer);
  }, [contest.startTime, contest.duration]);

  const config = PLATFORM_CONFIG[contest.platform] || {
    badgeClass: 'default',
    icon: '⚡',
    color: '#3b82f6',
  };

  const isLive = countdown.isLive || contest.status === 'LIVE';
  const isPast = countdown.isPast || contest.status === 'FINISHED';
  const isUpcoming = countdown.isUpcoming || (!isLive && !isPast);

  const calUrl = getGoogleCalendarUrl(contest);

  return (
    <div className={`contest-card ${config.badgeClass} ${isLive ? 'is-live' : ''} ${isPast ? 'is-past' : ''}`}>
      {/* Header: Platform Badge + Status Chip */}
      <div className="card-header">
        <div className={`platform-pill ${config.badgeClass}`}>
          <span className="platform-icon">{config.icon}</span>
          <span className="platform-name">{contest.platform}</span>
        </div>

        <div className="status-chip-wrapper">
          {isLive && (
            <span className="status-chip live">
              <span className="live-dot-pulse"></span>
              LIVE NOW
            </span>
          )}
          {isUpcoming && (
            <span className="status-chip upcoming">
              Upcoming
            </span>
          )}
          {isPast && (
            <span className="status-chip past">
              Finished
            </span>
          )}
        </div>
      </div>

      {/* Contest Title */}
      <div className="card-title-section">
        <h3 className="contest-title">
          <a 
            href={contest.url || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="contest-title-link"
            title={contest.name}
          >
            {contest.name}
          </a>
        </h3>
      </div>

      {/* Countdown Box (Highlight) */}
      {!isPast && (
        <div className={`countdown-box ${isLive ? 'live-box' : ''}`}>
          <div className="countdown-header">
            <Timer size={14} className="countdown-icon" />
            <span className="countdown-label">
              {isLive ? 'Time Remaining' : 'Countdown'}
            </span>
          </div>
          <div className="countdown-value">
            {countdown.text}
          </div>
        </div>
      )}

      {/* Details Grid: Date & Time + Duration */}
      <div className="card-details-grid">
        <div className="detail-item">
          <Calendar size={14} className="detail-icon" />
          <div className="detail-text-group">
            <span className="detail-label">Start Time</span>
            <span className="detail-value">{formatDateTime(contest.startTime)}</span>
          </div>
        </div>

        <div className="detail-item">
          <Clock size={14} className="detail-icon" />
          <div className="detail-text-group">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{formatDuration(contest.duration)}</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="card-actions">
        {!isPast && (
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn calendar-btn"
            title="Add to Google Calendar"
          >
            <CalendarPlus size={15} />
            <span>Remind Me</span>
          </a>
        )}

        <a
          href={contest.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn primary-btn"
        >
          <span>{isPast ? 'View Problems' : (isLive ? 'Join Contest' : 'Register')}</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

export default ContestCard;
