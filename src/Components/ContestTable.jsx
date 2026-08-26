import './ContestTable.css';
import { 
  formatDateTime, 
  formatDuration, 
  getCountdown, 
  getGoogleCalendarUrl 
} from '../utils/timeUtils';
import { ExternalLink, CalendarPlus } from 'lucide-react';

const ContestTable = ({ contests }) => {
  return (
    <div className="contest-table-container">
      <div className="table-responsive-wrapper">
        <table className="modern-contest-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Contest Name</th>
              <th>Status</th>
              <th>Start Time</th>
              <th>Duration</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {contests.map((contest, idx) => {
              const countdown = getCountdown(contest.startTime, contest.duration);
              const isLive = countdown.isLive || contest.status === 'LIVE';
              const isPast = countdown.isPast || contest.status === 'FINISHED';
              const calUrl = getGoogleCalendarUrl(contest);

              const platformClass = contest.platform?.toLowerCase() || 'default';

              return (
                <tr key={contest.id || idx} className={`table-row ${isLive ? 'is-live-row' : ''}`}>
                  {/* Platform */}
                  <td className="platform-col">
                    <span className={`table-platform-pill ${platformClass}`}>
                      {contest.platform === 'LeetCode' && '🟡'}
                      {contest.platform === 'Codeforces' && '🟢'}
                      {contest.platform === 'CodeChef' && '🔴'}
                      {' '}{contest.platform}
                    </span>
                  </td>

                  {/* Contest Name */}
                  <td className="name-col">
                    <a
                      href={contest.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="table-contest-name"
                    >
                      {contest.name}
                    </a>
                  </td>

                  {/* Status */}
                  <td className="status-col">
                    {isLive && (
                      <span className="table-status-pill live">
                        <span className="pulse-dot"></span>
                        LIVE
                      </span>
                    )}
                    {!isLive && !isPast && (
                      <span className="table-status-pill upcoming">
                        {countdown.text.split(' ')[0] === 'Starts' ? countdown.text : 'Upcoming'}
                      </span>
                    )}
                    {isPast && (
                      <span className="table-status-pill past">
                        Finished
                      </span>
                    )}
                  </td>

                  {/* Start Time */}
                  <td className="time-col">
                    <div className="table-time-wrap">
                      <span className="table-full-time">{formatDateTime(contest.startTime)}</span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="duration-col">
                    <span className="table-duration">{formatDuration(contest.duration)}</span>
                  </td>

                  {/* Actions */}
                  <td className="action-col">
                    <div className="table-actions-group">
                      {!isPast && (
                        <a
                          href={calUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-icon-btn"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus size={15} />
                        </a>
                      )}
                      <a
                        href={contest.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-join-btn"
                      >
                        <span>{isPast ? 'View' : 'Open'}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContestTable;
