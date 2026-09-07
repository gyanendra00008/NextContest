import { useState, useEffect } from 'react';
import { Timer, Check, ExternalLink, Flag, AlertTriangle } from 'lucide-react';

const ActiveContestSession = ({
  contest,
  session,
  onToggleSolved,
  onFinishContest
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!session || !session.startTime) return 90 * 60;
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const totalSec = (session.durationMinutes || 90) * 60;
    return Math.max(0, totalSec - elapsed);
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (!session || !session.startTime) return;
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const totalSec = (session.durationMinutes || 90) * 60;
      const left = Math.max(0, totalSec - elapsed);
      setSecondsRemaining(left);

      if (left === 0) {
        clearInterval(interval);
        onFinishContest();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, onFinishContest]);

  const problems = contest?.problems || [];
  const solvedSet = new Set(session?.solvedSlugs || []);
  const solvedCount = solvedSet.size;
  const totalProblems = problems.length;
  const progressPercent = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;

  // Format seconds to HH:MM:SS
  const hrs = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const timerText = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

  const isWarning = secondsRemaining <= 15 * 60 && secondsRemaining > 5 * 60;
  const isDanger = secondsRemaining <= 5 * 60;

  return (
    <div className="ai-active-session-container">
      {/* Sticky Top Bar with Live Timer & Progress */}
      <div className="ai-session-topbar">
        <div className="ai-session-status-group">
          <span className="ai-live-indicator">
            <span className="live-dot-pulse"></span>
            LIVE SESSION
          </span>
          <div className={`ai-session-timer-box ${isDanger ? 'danger' : isWarning ? 'warning' : ''}`}>
            <Timer size={16} />
            <span className="ai-timer-digits">{timerText}</span>
          </div>
        </div>

        <div className="ai-session-progress-group">
          <div className="ai-progress-track">
            <div className="ai-progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="ai-progress-count">
            {solvedCount} / {totalProblems} Solved
          </span>
        </div>

        <button
          type="button"
          className="ai-finish-btn"
          onClick={() => setShowConfirmModal(true)}
        >
          <Flag size={14} />
          <span>Finish Contest</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="ai-modal-backdrop" role="dialog" aria-modal="true">
          <div className="ai-modal-card">
            <div className="ai-modal-icon-wrap">
              <AlertTriangle size={24} />
            </div>
            <h3 className="ai-modal-title">End Contest Early?</h3>
            <p className="ai-modal-desc">
              You have currently solved <strong>{solvedCount}</strong> out of <strong>{totalProblems}</strong> problems. Finishing will finalize your score and generate your performance debrief.
            </p>
            <div className="ai-modal-actions">
              <button
                type="button"
                className="ai-modal-btn cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Resume Contest
              </button>
              <button
                type="button"
                className="ai-modal-btn confirm"
                onClick={() => {
                  setShowConfirmModal(false);
                  onFinishContest();
                }}
              >
                Yes, Finalize Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Problem Checklist */}
      <div className="ai-active-problem-list">
        {problems.map((prob) => {
          const isSolved = solvedSet.has(prob.title_slug);
          const slot = prob.slot || 'Q1';
          const diffClass = (prob.difficulty || 'Medium').toLowerCase();
          const solveTimestamp = session?.solveTimestamps?.[prob.title_slug];
          const solveMinutes = solveTimestamp && session?.startTime
            ? Math.max(1, Math.round((solveTimestamp - session.startTime) / 60000))
            : null;

          return (
            <div
              key={prob.title_slug || prob.frontend_id}
              className={`ai-active-problem-row ${isSolved ? 'is-solved' : ''}`}
            >
              <div className="ai-active-problem-left">
                {/* Solve Checkbox */}
                <button
                  type="button"
                  className={`ai-solve-checkbox-btn ${isSolved ? 'checked' : ''}`}
                  onClick={() => onToggleSolved(prob.title_slug)}
                  title={isSolved ? "Mark as unsolved" : "Mark as solved"}
                  aria-label={`Mark ${prob.title} as ${isSolved ? 'unsolved' : 'solved'}`}
                >
                  {isSolved && <Check size={16} strokeWidth={3} />}
                </button>

                <div className="ai-active-problem-info">
                  <div className="ai-active-problem-header">
                    <span className="ai-slot-badge">{slot}</span>
                    <span className={`ai-diff-chip ${diffClass}`}>
                      <span className={`ai-diff-dot ${diffClass}`}></span>
                      {prob.difficulty}
                    </span>
                    <span className="ai-active-title">
                      {prob.frontend_id ? `${prob.frontend_id}. ` : ''}{prob.title}
                    </span>
                    {isSolved && solveMinutes !== null && (
                      <span className="ai-solved-time-pill">
                        Solved in {solveMinutes} min
                      </span>
                    )}
                  </div>
                  {prob.rationale && (
                    <span className="ai-active-rationale">{prob.rationale}</span>
                  )}
                </div>
              </div>

              {/* Solve External Link */}
              <div className="ai-active-problem-right">
                <a
                  href={prob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-solve-on-lc-btn"
                  title="Open problem in new tab"
                >
                  <span>Solve on LeetCode</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveContestSession;
