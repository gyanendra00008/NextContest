import { Bot, Lightbulb, Target, Compass, Zap } from 'lucide-react';

const AiCoachInsights = ({ aiAnalysis }) => {
  if (!aiAnalysis) return null;

  const strengths = aiAnalysis.strengths || [];
  const weaknesses = aiAnalysis.weaknesses || [];
  const recommendedTopics = aiAnalysis.recommended_topics || [];
  const recommendedDifficulty = aiAnalysis.recommended_difficulty || 'Medium';
  const strategy = aiAnalysis.training_strategy || '';

  return (
    <div className="ai-coach-card">
      <div className="ai-coach-header">
        <div className="ai-coach-brand">
          <div className="ai-coach-avatar">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="ai-coach-title">AI Competitive Programming Coach</h3>
            <span className="ai-coach-subtitle">Personalized Mentor Analysis & Strategy</span>
          </div>
        </div>

        <div className="ai-coach-diff-badge">
          <Target size={14} />
          <span>Recommended Target: {recommendedDifficulty}</span>
        </div>
      </div>

      <div className="ai-coach-grid">
        {/* Identified Strengths */}
        <div className="ai-coach-block">
          <div className="ai-coach-block-label">
            <Zap size={14} />
            <span>Core Strengths</span>
          </div>
          <ul className="ai-coach-list">
            {strengths.length > 0 ? (
              strengths.map((s, idx) => (
                <li key={idx}>
                  <span className="ai-coach-bullet" style={{ background: '#10b981' }}></span>
                  <span>{s}</span>
                </li>
              ))
            ) : (
              <li>Arrays and Hash Tables</li>
            )}
          </ul>
        </div>

        {/* Priority Focus Areas */}
        <div className="ai-coach-block">
          <div className="ai-coach-block-label">
            <Compass size={14} />
            <span>Priority Focus Areas</span>
          </div>
          <ul className="ai-coach-list">
            {weaknesses.length > 0 ? (
              weaknesses.map((w, idx) => (
                <li key={idx}>
                  <span className="ai-coach-bullet" style={{ background: '#f59e0b' }}></span>
                  <span>{w}</span>
                </li>
              ))
            ) : (
              <li>Dynamic Programming & Graphs</li>
            )}
          </ul>
        </div>

        {/* Recommended Practice Topics */}
        <div className="ai-coach-block">
          <div className="ai-coach-block-label">
            <Lightbulb size={14} />
            <span>Recommended Topics</span>
          </div>
          <div className="ai-topic-chips-list" style={{ marginTop: '0.4rem' }}>
            {recommendedTopics.length > 0 ? (
              recommendedTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="ai-mini-tag"
                  style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#d8b4fe' }}
                >
                  {topic}
                </span>
              ))
            ) : (
              <span className="ai-mini-tag">BFS/DFS, 1D DP, Sliding Window</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Training Strategy */}
      {strategy && (
        <div className="ai-strategy-box">
          <div className="ai-strategy-title">Actionable Coaching Strategy</div>
          <p className="ai-strategy-text">{strategy}</p>
        </div>
      )}
    </div>
  );
};

export default AiCoachInsights;
