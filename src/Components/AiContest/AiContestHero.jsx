import { useState } from 'react';
import { ArrowRight, User, AlertCircle, X, Terminal } from 'lucide-react';

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
        <Terminal size={13} />
        <span>ADAPTIVE CONTEST ENGINE</span>
      </div>

      <h1 className="ai-hero-title">
        Personalized Contest <span className="ai-hero-title-sub">Generator</span>
      </h1>

      <p className="ai-hero-subtitle">
        Analyze your competitive programming profile and generate a 4-problem contest calibrated specifically for your skill level and growth areas.
      </p>

      <div className="ai-input-box-wrapper">
        <form onSubmit={handleSubmit} className="ai-input-form">
          <User size={16} className="ai-input-icon" />
          <input
            type="text"
            placeholder="Enter LeetCode username..."
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
              className="ai-input-clear-btn"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className="ai-submit-btn"
            disabled={isLoading || !username.trim()}
          >
            <span>Analyze Profile</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="ai-quick-samples">
          <span className="ai-samples-label">Test with:</span>
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
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiContestHero;
