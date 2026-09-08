import { Trophy, CheckCircle2, Shield, Calendar, TrendingUp, Compass, Award } from 'lucide-react';

const UserProfileDashboard = ({ profile }) => {
  if (!profile) return null;

  const rating = profile.contest_rating ?? 'Unrated';
  const totalSolved =
    profile.total_problems_solved ??
    profile.total_solved ??
    (profile.submitStatsGlobal?.acSubmissionNum?.find(s => s.difficulty?.toLowerCase() === 'all')?.count) ??
    (profile.submitStats?.acSubmissionNum?.find(s => s.difficulty?.toLowerCase() === 'all')?.count) ??
    0;
  const level = profile.contest_level ?? profile.rating_level ?? 'Beginner';
  const contestsAttended = profile.contests_attended ?? 0;

  const strongTopics = profile.strong_topics || [];
  const weakTopics = profile.weak_topics || [];

  return (
    <div className="ai-profile-dashboard">
      <div className="ai-section-header">
        <div className="ai-section-title-group">
          <Shield size={18} className="ai-section-icon" />
          <h2 className="ai-section-heading">Competitive Profile</h2>
        </div>
        <span className="ai-user-handle-badge">@{profile.username}</span>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="ai-profile-stats-grid">
        <div className="ai-stat-card">
          <div className="ai-stat-icon-box rating">
            <Trophy size={18} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{rating}</span>
            <span className="ai-stat-lbl">Contest Rating</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box solved">
            <CheckCircle2 size={18} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{totalSolved}</span>
            <span className="ai-stat-lbl">Solved</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box tier">
            <Award size={18} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{level}</span>
            <span className="ai-stat-lbl">Level</span>
          </div>
        </div>

        <div className="ai-stat-card">
          <div className="ai-stat-icon-box contests">
            <Calendar size={18} />
          </div>
          <div className="ai-stat-content">
            <span className="ai-stat-val">{contestsAttended}</span>
            <span className="ai-stat-lbl">Attended</span>
          </div>
        </div>
      </div>

      {/* Topic Analysis Grid */}
      <div className="ai-topics-analysis-grid">
        {/* Strong Foundations */}
        <div className="ai-topic-panel strengths">
          <div className="ai-topic-panel-header">
            <div className="ai-topic-panel-title strengths">
              <TrendingUp size={16} />
              <span>Demonstrated Mastery</span>
            </div>
          </div>
          <p className="ai-topic-panel-desc">
            Algorithmic patterns where you have demonstrated consistent practice and problem-solving familiarity.
          </p>
          <div className="ai-topic-chips-list">
            {strongTopics.length > 0 ? (
              strongTopics.map((item, idx) => {
                const name = typeof item === 'object' ? item.topic || item.name : item;
                const count = typeof item === 'object' ? item.solved : null;
                return (
                  <div key={idx} className="ai-topic-badge strength">
                    <span className="ai-topic-badge-name">{name}</span>
                    {count !== null && count !== undefined && (
                      <span className="ai-topic-count">{count}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="ai-topic-fallback">
                Arrays, Strings & Math foundations
              </span>
            )}
          </div>
        </div>

        {/* Growth Areas */}
        <div className="ai-topic-panel growth">
          <div className="ai-topic-panel-header">
            <div className="ai-topic-panel-title growth">
              <Compass size={16} />
              <span>Target Growth Areas</span>
            </div>
          </div>
          <p className="ai-topic-panel-desc">
            Topics and core patterns recommended to overcome current rating bottlenecks under timed conditions.
          </p>
          <div className="ai-topic-chips-list">
            {weakTopics.length > 0 ? (
              weakTopics.map((item, idx) => {
                const name = typeof item === 'object' ? item.topic || item.name : item;
                const count = typeof item === 'object' ? item.solved : null;
                return (
                  <div key={idx} className="ai-topic-badge growth">
                    <span className="ai-topic-badge-name">{name}</span>
                    {count !== null && count !== undefined && (
                      <span className="ai-topic-count">{count}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="ai-topic-fallback">
                Dynamic Programming, Graph Theory & Trees
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileDashboard;
