import { Play, RotateCw, Clock, Trophy, ExternalLink, ShieldCheck } from 'lucide-react';

const SLOT_PROGRESSION_LABELS = {
  Q1: 'Warm-up',
  Q2: 'Core Pattern',
  Q3: 'Targeted Growth',
  Q4: 'Contest Challenge'
};

const PersonalizedContestPreview = ({ contest, onStartContest, onReroll, isRerolling }) => {
  if (!contest || !contest.problems) return null;

  const durationMins = contest.target_duration_minutes || 90;
  const tier = contest.difficulty_tier || 'Intermediate';
  const problems = contest.problems || [];

  return (
    <div className="ai-contest-preview-card">
      <div className="ai-contest-header-row">
        <div className="ai-contest-heading-box">
          <div className="ai-badge" style={{ alignSelf: 'flex-start', margin: 0 }}>
            <span>Personalized Contest Generation</span>
          </div>
          <h2 className="ai-contest-title">{contest.title || 'Your Personalized Contest'}</h2>
          <div className="ai-contest-meta-chips">
            <span className="ai-meta-pill">
              <Clock size={13} />
              <span>{durationMins} Minutes</span>
            </span>
            <span className="ai-meta-pill">
              <Trophy size={13} />
              <span>{problems.length} Problems</span>
            </span>
            <span className="ai-meta-pill">
              <ShieldCheck size={13} />
              <span>Tier: {tier}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ai-reroll-btn"
          onClick={onReroll}
          disabled={isRerolling}
          title="Generate a fresh problem combination"
        >
          <RotateCw size={15} className={isRerolling ? 'spinning' : ''} />
          <span>New Variant</span>
        </button>
      </div>

      {contest.summary && (
        <p className="ai-contest-summary-text">{contest.summary}</p>
      )}

      {/* 4 Problem Cards Grid */}
      <div className="ai-problems-grid">
        {problems.map((prob) => {
          const slot = prob.slot || 'Q1';
          const roleLabel = prob.slot_label || SLOT_PROGRESSION_LABELS[slot] || 'Challenge';
          const diffClass = (prob.difficulty || 'Medium').toLowerCase();

          return (
            <div key={prob.title_slug || prob.frontend_id} className="ai-problem-card">
              <div className="ai-problem-top">
                <div className="ai-slot-row">
                  <span className="ai-slot-badge">{slot}</span>
                  <span className="ai-slot-role-pill">{roleLabel}</span>
                  <span className={`ai-diff-chip ${diffClass}`}>{prob.difficulty}</span>
                </div>

                <a
                  href={prob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-problem-title-link"
                  title="View problem on LeetCode"
                >
                  <span>{prob.frontend_id ? `${prob.frontend_id}. ` : ''}{prob.title}</span>
                  <ExternalLink size={14} />
                </a>

                {prob.tags && prob.tags.length > 0 && (
                  <div className="ai-problem-tags">
                    {prob.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="ai-mini-tag">{tag}</span>
                    ))}
                  </div>
                )}

                {prob.rationale && (
                  <div className="ai-problem-rationale">
                    {prob.rationale}
                  </div>
                )}
              </div>

              <div className="ai-problem-bottom-bar">
                <span className="ai-ac-rate">Acceptance: {prob.ac_rate || 'N/A'}</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Free Access</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary CTA */}
      <div className="ai-contest-cta-bar">
        <button
          type="button"
          className="ai-start-contest-btn"
          onClick={onStartContest}
        >
          <Play size={18} fill="currentColor" />
          <span>START PERSONALIZED CONTEST</span>
        </button>
      </div>
    </div>
  );
};

export default PersonalizedContestPreview;
