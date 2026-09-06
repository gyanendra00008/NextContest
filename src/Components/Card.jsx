import './Card.css';
import ContestCard from './ContestCard';
import ContestTable from './ContestTable';
import { AlertCircle, RefreshCw, CalendarSearch } from 'lucide-react';

const Card = ({
  contests = [],
  loading = false,
  error = null,
  viewMode = 'grid',
  onRetry,
  activeStatus = 'upcoming',
  searchQuery = '',
  platform = 'All'
}) => {
  // Loading Skeletons
  if (loading) {
    return (
      <div className="contest-loading-container">
        <div className="loading-spinner-wrapper">
          <RefreshCw className="loading-spin-icon" size={32} />
          <p className="loading-text">Fetching latest contest schedules...</p>
          <span className="loading-subtext">Connecting to LeetCode, Codeforces, CodeChef & AtCoder APIs</span>
        </div>
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="skeleton-card">
              <div className="skeleton-line skeleton-header"></div>
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-box"></div>
              <div className="skeleton-line skeleton-detail"></div>
              <div className="skeleton-line skeleton-actions"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="contest-error-container">
        <div className="error-card">
          <AlertCircle size={44} className="error-icon" />
          <h3 className="error-title">Unable to Load Contests</h3>
          <p className="error-message">{error}</p>
          {onRetry && (
            <button className="error-retry-btn" onClick={onRetry}>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty State (No contests match filter or search)
  if (contests.length === 0) {
    return (
      <div className="contest-empty-container">
        <div className="empty-card">
          <CalendarSearch size={48} className="empty-icon" />
          <h3 className="empty-title">No Contests Found</h3>
          <p className="empty-description">
            {searchQuery
              ? `No contests matching "${searchQuery}" in ${platform} (${activeStatus}).`
              : `There are currently no ${activeStatus} contests listed for ${platform}.`}
          </p>
          {onRetry && (
            <button className="empty-refresh-btn" onClick={onRetry}>
              <RefreshCw size={15} />
              <span>Check for Updates</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render Grid or Table view
  return (
    <div className="contests-display-area">
      {viewMode === 'grid' ? (
        <div className="contest-cards-grid">
          {contests.map((contest, index) => (
            <ContestCard key={contest.id || index} contest={contest} />
          ))}
        </div>
      ) : (
        <ContestTable contests={contests} />
      )}
    </div>
  );
};

export default Card;
