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
            <span className="pulse-dot"></span>
            LIVE CONTEST
          </span>
          <div className={`ai-session-timer-box ${isDanger ? 'danger' : isWarning ? 'warning' : ''}`}>
            <Timer size={18} />
            <span>{timerText}</span>
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
          <Flag size={15} />
          <span>Finish Contest</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <AlertTriangle size={44} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Finish Contest Early?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              You still have <strong>{timerText}</strong> left on the clock with <strong>{solvedCount} of {totalProblems}</strong> problems marked as solved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continue Solving
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  onFinishContest();
                }}
                style={{
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contest Problems List */}
      <div className="ai-active-problem-list">
        {problems.map((prob) => {
          const isSolved = solvedSet.has(prob.title_slug);
          const diffClass = (prob.difficulty || 'Medium').toLowerCase();

          return (
            <div
              key={prob.title_slug}
              className={`ai-active-problem-row ${isSolved ? 'is-solved' : ''}`}
            >
              <div className="ai-active-problem-left">
                {/* Checkbox toggle */}
                <button
                  type="button"
                  className={`ai-solve-checkbox-btn ${isSolved ? 'checked' : ''}`}
                  onClick={() => onToggleSolved(prob.title_slug)}
                  title={isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}
                >
                  <Check size={18} strokeWidth={3} />
                </button>

                <div className="ai-active-problem-info">
                  <div className="ai-active-problem-header">
                    <span className="ai-slot-badge">{prob.slot || 'Q'}</span>
                    <span className={`ai-diff-chip ${diffClass}`}>{prob.difficulty}</span>
                    <span className="ai-active-title">
                      {prob.frontend_id ? `${prob.frontend_id}. ` : ''}{prob.title}
                    </span>
                  </div>

                  <div className="ai-active-rationale">
                    <span>{prob.primary_tag}</span> • <span>{prob.rationale}</span>
                  </div>
                </div>
              </div>

              {/* Solve on LeetCode Link */}
              <a
                href={prob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-solve-on-lc-btn"
              >
                <span>Solve on LeetCode</span>
                <ExternalLink size={14} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveContestSession;
