import { Trophy, CheckCircle2, Shield, Calendar, TrendingUp, Sparkles } from 'lucide-react';

const UserProfileDashboard = ({ profile }) => {
  if (!profile) return null;

  const rating = profile.contest_rating ?? 'Unrated';
  const totalSolved = profile.total_problems_solved ?? profile.total_solved ?? 0;
  const level = profile.contest_level ?? profile.rating_level ?? 'Beginner';
  const contestsAttended = profile.contests_attended ?? 0;

  const strongTopics = profile.strong_topics || [];
  const weakTopics = profile.weak_topics || [];

  return (
    <div className="ai-profile-dashboard">
      <div className="ai-section-header">
        <div className="ai-section-title-group">
          <Shield size={20} className="ai-section-icon" />
          <h2 className="ai-section-heading">Competitive Profile Overview</h2>
        </div>
        <span className="ai-user-handle-badge">@{profile.username}</span>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="ai-profile-stats-grid">
        <div className="ai-stat-card">
          <div className="ai-stat-icon-box rating">
            <Trophy size={22} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{rating}</span>
            <span className="ai-stat-lbl">Contest Rating</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box solved">
            <CheckCircle2 size={22} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{totalSolved}</span>
            <span className="ai-stat-lbl">Problems Solved</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box tier">
            <TrendingUp size={22} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{level}</span>
            <span className="ai-stat-lbl">Contest Level</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box contests">
            <Calendar size={22} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{contestsAttended}</span>
            <span className="ai-stat-lbl">Contests Attended</span>
          </div>
        </div>
      </div>

      {/* Topic Analysis Grid */}
      <div className="ai-topics-analysis-grid">
        {/* Strong Foundations */}
        <div className="ai-topic-panel strengths">
          <div className="ai-topic-panel-header">
            <div className="ai-topic-panel-title strengths">
              <Sparkles size={18} />
              <span>Strong Foundations</span>
            </div>
          </div>
          <p className="ai-topic-panel-desc">
            Topics where you exhibit consistent practice and algorithmic familiarity.
          </p>
          <div className="ai-topic-chips-list">
            {strongTopics.length > 0 ? (
              strongTopics.map((item, idx) => {
                const name = typeof item === 'object' ? item.topic || item.name : item;
                const count = typeof item === 'object' ? item.solved : null;
                return (
                  <div key={idx} className="ai-topic-badge strength">
                    <span>{name}</span>
                    {count !== null && count !== undefined && (
                      <span className="ai-topic-count">{count} solved</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Foundations in Arrays, Strings & Math
              </span>
            )}
          </div>
        </div>

        {/* Growth Areas */}
        <div className="ai-topic-panel growth">
          <div className="ai-topic-panel-header">
            <div className="ai-topic-panel-title growth">
              <TrendingUp size={18} />
              <span>Targeted Growth Areas</span>
            </div>
          </div>
          <p className="ai-topic-panel-desc">
            Algorithmic patterns prioritized to help you break through your current rating threshold.
          </p>
          <div className="ai-topic-chips-list">
            {weakTopics.length > 0 ? (
              weakTopics.map((item, idx) => {
                const name = typeof item === 'object' ? item.topic || item.name : item;
                const count = typeof item === 'object' ? item.solved : null;
                return (
                  <div key={idx} className="ai-topic-badge growth">
                    <span>{name}</span>
                    {count !== null && count !== undefined && (
                      <span className="ai-topic-count">{count} solved</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Advancing in Dynamic Programming, Graphs & Trees
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileDashboard;
