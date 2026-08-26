import './PlatformSelector.css';
import { Search, LayoutGrid, Table, X } from 'lucide-react';

const PLATFORMS = [
  { id: 'All', name: 'All Platforms', icon: '⚡', color: '#38bdf8' },
  { id: 'Leetcode', name: 'LeetCode', icon: '🟡', color: '#f59e0b' },
  { id: 'Codeforces', name: 'Codeforces', icon: '🟢', color: '#38bdf8' },
  { id: 'Codechef', name: 'CodeChef', icon: '🔴', color: '#a855f7' },
];

const STATUS_TABS = [
  { id: 'upcoming', label: 'Upcoming', icon: '⏳' },
  { id: 'live', label: 'Live Now', icon: '🔴' },
  { id: 'past', label: 'Past Contests', icon: '📜' },
];

const PlatformSelector = ({
  activePlatform,
  setActivePlatform,
  activeStatus,
  setActiveStatus,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  counts
}) => {
  return (
    <div className="filter-panel-container">
      {/* Top Row: Platform Tabs */}
      <div className="platform-tabs-wrapper">
        <div className="platform-tabs">
          {PLATFORMS.map((p) => {
            const isActive = activePlatform === p.id;
            return (
              <button
                key={p.id}
                className={`platform-tab-btn ${isActive ? 'active' : ''} ${p.id.toLowerCase()}`}
                onClick={() => setActivePlatform(p.id)}
              >
                <span className="platform-tab-icon">{p.icon}</span>
                <span className="platform-tab-name">{p.name}</span>
                {counts?.[p.id] !== undefined && (
                  <span className="platform-tab-count">{counts[p.id]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Row: Status tabs, Search, View Switcher */}
      <div className="controls-subbar">
        {/* Status Filter Tabs */}
        <div className="status-tabs">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.id;
            const count = counts?.[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                className={`status-tab-btn ${isActive ? 'active' : ''} ${tab.id}`}
                onClick={() => setActiveStatus(tab.id)}
              >
                <span className="status-icon">{tab.icon}</span>
                <span className="status-label">{tab.label}</span>
                {count > 0 && <span className="status-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search & View Toggle Wrapper */}
        <div className="search-and-view">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Cards View"
              aria-label="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              <Table size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSelector;
