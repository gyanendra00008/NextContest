import { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';

const STAGES = [
  "Fetching LeetCode profile",
  "Analyzing solved problems",
  "Evaluating contest performance",
  "Detecting topic strengths",
  "Identifying growth areas",
  "AI coach is preparing insights",
  "Generating your personalized contest"
];

const AiLoadingStages = ({ username }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    // Increment stage every 600-800ms to show real progression
    const timer = setInterval(() => {
      setCurrentStageIdx((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 650);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ai-loading-card">
      <div className="ai-loading-header">
        <div className="ai-loading-spinner-wrap">
          <div className="ai-loading-spinner"></div>
          <div className="ai-loading-icon-center">
            <Sparkles size={22} />
          </div>
        </div>
        <h3 className="ai-loading-title">Analyzing Profile for @{username}</h3>
        <p className="ai-loading-subtitle">
          Crunching problem data and constructing your personalized contest...
        </p>
      </div>

      <div className="ai-stages-list">
        {STAGES.map((stageText, idx) => {
          const isCompleted = idx < currentStageIdx;
          const isActive = idx === currentStageIdx;
          const isPending = idx > currentStageIdx;

          return (
            <div
              key={stageText}
              className={`ai-stage-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
            >
              <div className="ai-stage-status-icon">
                {isCompleted && <Check size={13} strokeWidth={3} />}
                {isActive && <Loader2 size={13} className="spinning" />}
              </div>
              <span className="ai-stage-label">{stageText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AiLoadingStages;
