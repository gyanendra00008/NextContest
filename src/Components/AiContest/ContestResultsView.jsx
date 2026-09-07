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

  // Deterministic Performance Insights
  const isQ1Solved = problems[0] && solvedSet.has(problems[0].title_slug);
  const isQ2Solved = problems[1] && solvedSet.has(problems[1].title_slug);
  const isQ3Solved = problems[2] && solvedSet.has(problems[2].title_slug);
  const isQ4Solved = problems[3] && solvedSet.has(problems[3].title_slug);

  let insightHeadline;
  let insightText;

  if (solvedCount >= 3) {
    insightHeadline = "Strong Performance";
    insightText = "Strong performance. You solved most of the problems selected for your current skill level.";
  } else if ((isQ1Solved || isQ2Solved) && (!isQ3Solved || !isQ4Solved)) {
    insightHeadline = "Solid Foundations, Advance Higher Patterns";
    insightText = "You handled foundational patterns well. Your next improvement area is solving higher-complexity problems under time pressure.";
  } else if (solvedCount <= 1) {
    insightHeadline = "Targeted Growth Practice";
    insightText = "This contest highlighted useful growth areas. Focus on the recommended topics and gradually build difficulty.";
  } else {
    insightHeadline = "Balanced Momentum";
    insightText = "Balanced contest attempt. Review the editorial solutions for the remaining questions to solidify the patterns under timed pressure.";
  }

  return (
    <div className="ai-results-card">
      <div className="ai-results-trophy-icon">
        <Trophy size={32} />
      </div>

      <h1 className="ai-results-title">Contest Complete</h1>
      <p className="ai-results-subtitle">
        Your 90-minute personalized contest simulation has concluded. Here is your post-contest debrief.
      </p>

      {/* Stats Summary Cards */}
      <div className="ai-results-stats-row">
        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val solved-val">
            {solvedCount} / {totalProblems}
          </div>
          <div className="ai-result-stat-lbl">Score: Solved</div>
        </div>

        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val duration-val">
            {totalDurationMinutes} mins
          </div>
          <div className="ai-result-stat-lbl">Duration</div>
        </div>

        <div className="ai-result-stat-box">
          <div className="ai-result-stat-val tier-val">
            {contest?.difficulty_tier || 'Intermediate'}
          </div>
          <div className="ai-result-stat-lbl">Difficulty Tier</div>
        </div>
      </div>

      {/* Deterministic Performance Insights Section */}
      <div className="ai-insights-box">
        <div className="ai-insights-header">
          <Lightbulb size={14} className="ai-insights-icon" />
          <span>Performance Insights</span>
        </div>
        <h4 className="ai-insights-headline">{insightHeadline}</h4>
        <p className="ai-insights-desc">{insightText}</p>
      </div>

      {/* Problem Breakdown List with Timestamps */}
      <div className="ai-breakdown-container">
        <h3 className="ai-breakdown-heading">Problem Breakdown</h3>

        <div className="ai-breakdown-list">
          {problems.map((prob, idx) => {
            const isSolved = solvedSet.has(prob.title_slug);
            const solveMin = solveTimestamps[prob.title_slug];
            const slot = prob.slot || `Q${idx + 1}`;

            return (
              <div
                key={prob.title_slug || idx}
                className={`ai-breakdown-row ${isSolved ? 'is-solved' : 'is-unsolved'}`}
              >
                <div className="ai-breakdown-row-left">
                  <span className={`ai-breakdown-status-badge ${isSolved ? 'solved' : 'unsolved'}`}>
                    {isSolved ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <XCircle size={15} />
                    )}
                  </span>
                  <div className="ai-breakdown-info">
                    <span className="ai-breakdown-slot">{slot}</span>
                    <span className="ai-breakdown-name">{prob.title}</span>
                  </div>
                </div>

                <div className="ai-breakdown-row-right">
                  {isSolved ? (
                    <span className="ai-solve-badge-time">
                      ✓ Solved in {solveMin || 1} {solveMin === 1 ? 'min' : 'mins'}
                    </span>
                  ) : (
                    <span className="ai-unsolved-badge-text">
                      ✗ Not solved
                    </span>
                  )}
                  <a
                    href={prob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-upsolve-link"
                    title="Upsolve problem"
                  >
                    Upsolve
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation & Reset Actions */}
      <div className="ai-results-actions">
        <button
          type="button"
          className="ai-results-btn secondary"
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={15} />
          <span>Profile Overview</span>
        </button>

        <button
          type="button"
          className="ai-results-btn primary"
          onClick={onNewContest}
        >
          <RotateCw size={15} />
          <span>Generate New Contest</span>
        </button>
      </div>
    </div>
  );
};

export default ContestResultsView;
