import { useState, useEffect } from 'react';
import { Check, Loader2, Terminal } from 'lucide-react';

const STAGES = [
  "Querying LeetCode profile & submissions",
  "Indexing topic distribution & solved volume",
  "Evaluating contest rating & volatility",
  "Extracting algorithmic strength patterns",
  "Identifying targeted growth opportunities",
  "Synthesizing coach debrief & strategy",
  "Assembling calibrated 4-problem contest"
];

const AiLoadingStages = ({ username }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStageIdx((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ai-loading-card">
      <div className="ai-loading-header">
        <div className="ai-loading-spinner-wrap">
          <div className="ai-loading-spinner"></div>
          <div className="ai-loading-icon-center">
            <Terminal size={18} />
          </div>
        </div>
        <h3 className="ai-loading-title">Analyzing Profile for @{username}</h3>
        <p className="ai-loading-subtitle">
          Querying data layer and building calibrated problem recommendation curve...
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
                {isCompleted && <Check size={12} strokeWidth={3} />}
                {isActive && <Loader2 size={12} className="spinning" />}
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
