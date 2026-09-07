import { Target, Compass, Zap, BookOpen } from 'lucide-react';

const AiCoachInsights = ({ aiAnalysis }) => {
  if (!aiAnalysis) return null;

  const strengths = aiAnalysis.strengths || [];
  const weaknesses = aiAnalysis.weaknesses || [];
  const recommendedTopics = aiAnalysis.recommended_topics || [];
  const recommendedDifficulty = aiAnalysis.recommended_difficulty || 'Medium';
  const strategy = aiAnalysis.training_strategy || '';

  const diffClass = (recommendedDifficulty || 'medium').toLowerCase();

  return (
    <div className="coach-analysis-card">
      <div className="coach-analysis-header">
        <div className="coach-header-left">
          <span className="coach-section-tag">COACH ANALYSIS</span>
          <h3 className="coach-analysis-title">Performance Debrief & Training Trajectory</h3>
        </div>

        <div className={`coach-diff-pill ${diffClass}`}>
          <Target size={13} />
          <span>Recommended Target: {recommendedDifficulty}</span>
        </div>
      </div>

      <div className="coach-analysis-divider" />

      <div className="coach-analysis-grid">
        {/* Identified Strengths */}
        <div className="coach-block">
          <div className="coach-block-header">
            <Zap size={14} className="coach-icon-strength" />
            <h4 className="coach-block-label">Strengths</h4>
          </div>
          <ul className="coach-list">
            {strengths.length > 0 ? (
              strengths.map((s, idx) => (
                <li key={idx}>
                  <span className="coach-bullet strength"></span>
                  <span className="coach-item-text">{s}</span>
                </li>
              ))
            ) : (
              <li>
                <span className="coach-bullet strength"></span>
                <span className="coach-item-text">Arrays and Hash Tables</span>
              </li>
            )}
          </ul>
        </div>

        {/* Priority Focus Areas */}
        <div className="coach-block">
          <div className="coach-block-header">
            <Compass size={14} className="coach-icon-focus" />
            <h4 className="coach-block-label">Focus Areas</h4>
          </div>
          <ul className="coach-list">
            {weaknesses.length > 0 ? (
              weaknesses.map((w, idx) => (
                <li key={idx}>
                  <span className="coach-bullet focus"></span>
                  <span className="coach-item-text">{w}</span>
                </li>
              ))
            ) : (
              <li>
                <span className="coach-bullet focus"></span>
                <span className="coach-item-text">Dynamic Programming & Graphs</span>
              </li>
            )}
          </ul>
        </div>

        {/* Recommended Practice Path */}
        <div className="coach-block">
          <div className="coach-block-header">
            <BookOpen size={14} className="coach-icon-topics" />
            <h4 className="coach-block-label">Recommended Path</h4>
          </div>
          <div className="coach-topic-chips">
            {recommendedTopics.length > 0 ? (
              recommendedTopics.map((topic, idx) => (
                <span key={idx} className="coach-topic-tag">
                  {topic}
                </span>
              ))
            ) : (
              <span className="coach-topic-tag">BFS / DFS · 1D DP · Sliding Window</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Training Strategy */}
      {strategy && (
        <div className="coach-strategy-card">
          <div className="coach-strategy-label">Strategy</div>
          <p className="coach-strategy-text">{strategy}</p>
        </div>
      )}
    </div>
  );
};

export default AiCoachInsights;
