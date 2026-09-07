import { useState } from 'react';
import { Sparkles, ArrowRight, User, AlertCircle, X } from 'lucide-react';

const SUGGESTIONS = ['tourist', 'neal_wu', 'lee215', 'StefanPochmann', 'hiepit'];

const AiContestHero = ({ onAnalyze, isLoading, error, initialUsername = '' }) => {
  const [username, setUsername] = useState(initialUsername);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean) {
      onAnalyze(clean);
    }
  };

  const handleSelectSample = (sample) => {
    setUsername(sample);
    onAnalyze(sample);
  };

  return (
    <div className="ai-hero-card">
      <div className="ai-badge">
        <Sparkles size={14} />
        <span>AI-Powered CP Intelligence</span>
      </div>

      <h1 className="ai-hero-title">
        AI Personalized <span>Contest</span>
      </h1>

      <p className="ai-hero-subtitle">
        Analyze your competitive programming profile and get a contest built specifically for your strengths and weaknesses.
      </p>

      <div className="ai-input-box-wrapper">
        <form onSubmit={handleSubmit} className="ai-input-form">
          <User size={18} className="ai-input-icon" />
          <input
            type="text"
            placeholder="Enter LeetCode username (e.g. your_handle)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="ai-input-field"
            disabled={isLoading}
            autoFocus
          />
          {username && (
            <button
              type="button"
              onClick={() => setUsername('')}
              style={{ color: '#64748b', padding: '0 4px', cursor: 'pointer' }}
              title="Clear"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="submit"
            className="ai-submit-btn"
            disabled={isLoading || !username.trim()}
          >
            <span>Analyze My Profile</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="ai-quick-samples">
          <span>Popular handles to test:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="ai-sample-chip"
              onClick={() => handleSelectSample(s)}
              disabled={isLoading}
            >
              @{s}
            </button>
          ))}
        </div>

        {error && (
          <div className="ai-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiContestHero;
