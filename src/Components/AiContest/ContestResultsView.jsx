import { Trophy, CheckCircle2, XCircle, RotateCw, ArrowLeft, Lightbulb } from 'lucide-react';

const ContestResultsView = ({
  contest,
  session,
  onNewContest,
  onBackToDashboard
}) => {
  const problems = contest?.problems || [];
  const solvedSet = new Set(session?.solvedSlugs || []);
  const solveTimestamps = session?.solveTimestamps || {};
  const solvedCount = solvedSet.size;
  const totalProblems = problems.length || 4;

  const elapsedSec = session?.completedTime && session?.startTime
    ? Math.max(60, Math.floor((session.completedTime - session.startTime) / 1000))
    : (session?.durationMinutes || 90) * 60;
  const totalDurationMinutes = Math.max(1, Math.ceil(elapsedSec / 60));

  // --- Step 12: Deterministic Performance Insights ---
  const isQ1Solved = problems[0] && solvedSet.has(problems[0].title_slug);
  const isQ2Solved = problems[1] && solvedSet.has(problems[1].title_slug);
  const isQ3Solved = problems[2] && solvedSet.has(problems[2].title_slug);
  const isQ4Solved = problems[3] && solvedSet.has(problems[3].title_slug);

  let insightHeadline;
  let insightText;

  if (solvedCount >= 3) {
    insightHeadline = "Strong Performance! 🏆";
    insightText = "Strong performance. You solved most of the problems selected for your current skill level.";
  } else if ((isQ1Solved || isQ2Solved) && (!isQ3Solved || !isQ4Solved)) {
    insightHeadline = "Solid Foundations, Target Advanced Patterns ⚡";
    insightText = "You handled foundational patterns well. Your next improvement area is solving higher-complexity problems under time pressure.";
  } else if (solvedCount <= 1) {
    insightHeadline = "Targeted Growth Practice 🎯";
    insightText = "This contest highlighted useful growth areas. Focus on the recommended topics and gradually build difficulty.";
  } else {
    insightHeadline = "Consistent Momentum! 💡";
    insightText = "Balanced contest attempt. Review the editorial solutions for the remaining questions to solidify the patterns under timed pressure.";
  }

  return (
    <div className="ai-results-card">
      <div className="ai-results-trophy-icon">
        <Trophy size={38} />
      </div>

      <h1 className="ai-results-title">Contest Complete</h1>
      <p className="ai-results-subtitle">
        Your 90-minute personalized contest simulation has concluded. Here is your comprehensive debrief.
      </p>

      {/* Stats Summary Cards */}
      <div className="ai-results-stats-row">
        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val" style={{ color: '#10b981' }}>
            {solvedCount} / {totalProblems}
          </div>
          <div className="ai-result-stat-lbl">Score: Problems Solved</div>
        </div>

        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val" style={{ color: '#38bdf8' }}>
            {totalDurationMinutes} mins
          </div>
          <div className="ai-result-stat-lbl">Total Duration</div>
        </div>

        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val" style={{ color: '#a855f7' }}>
            {contest?.difficulty_tier || 'Contest'}
          </div>
          <div className="ai-result-stat-lbl">Difficulty Tier</div>
        </div>
      </div>

      {/* Deterministic Performance Insights Section (Step 12) */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          textAlign: 'left',
          marginBottom: '2rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          <Lightbulb size={16} />
          <span>Performance Insights</span>
        </div>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
          {insightHeadline}
        </h4>
        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
          {insightText}
        </p>
      </div>

      {/* Problem Breakdown List with Timestamps (Step 11) */}
      <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.85rem' }}>
          Problem Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {problems.map((prob, idx) => {
            const isSolved = solvedSet.has(prob.title_slug);
            const solveMin = solveTimestamps[prob.title_slug];
            const slot = prob.slot || `Q${idx + 1}`;

            return (
              <div
                key={prob.title_slug || idx}
                style={{
                  background: isSolved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                  border: `1px solid ${isSolved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSolved ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSolved ? '#fff' : '#94a3b8',
                      flexShrink: 0
                    }}
                  >
                    {isSolved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                        {slot} {isSolved ? '✓' : '✗'}
                      </span>
                      <span style={{ fontWeight: 700, color: '#fff' }}>
                        {prob.title}
                      </span>
                      <span className={`ai-diff-chip ${(prob.difficulty || 'medium').toLowerCase()}`}>
                        {prob.difficulty}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: isSolved ? '#34d399' : '#94a3b8', marginTop: '0.2rem' }}>
                      {isSolved
                        ? `Solved in ${solveMin || Math.max(5, (idx + 1) * 12)} minutes`
                        : 'Not solved'}
                      {prob.primary_tag && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          • {prob.primary_tag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={prob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.82rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isSolved ? 'Review on LeetCode →' : 'Upsolve on LeetCode →'}
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action CTAs */}
      <div className="ai-results-actions">
        <button
          type="button"
          className="ai-reroll-btn"
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </button>

        <button
          type="button"
          className="ai-submit-btn"
          onClick={onNewContest}
        >
          <RotateCw size={16} />
          <span>Generate New Contest</span>
        </button>
      </div>
    </div>
  );
};

export default ContestResultsView;
