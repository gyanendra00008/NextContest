import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Terminal, Layers, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../context/themeConstants';
import './ThemeSwitcher.css';

const THEME_ICONS = {
  obsidian: Moon,
  paper: Sun,
  terminal: Terminal,
  slate: Layers
};

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const CurrentIcon = THEME_ICONS[theme] || Moon;
  const currentThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (themeId) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher-container" ref={dropdownRef}>
      <button
        type="button"
        className="theme-trigger-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Current visual theme: ${currentThemeObj.name}. Click to change theme.`}
        aria-expanded={isOpen}
        title={`Theme: ${currentThemeObj.name}`}
      >
        <CurrentIcon size={15} className="theme-trigger-icon" />
        <span className="theme-trigger-name">{currentThemeObj.name}</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu" role="menu" aria-orientation="vertical">
          <div className="theme-menu-header">Appearance</div>
          <div className="theme-options-list">
            {THEMES.map((t) => {
              const IconComponent = THEME_ICONS[t.id] || Moon;
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  className={`theme-option-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelect(t.id)}
                >
                  <div className="theme-option-left">
                    <IconComponent size={14} className="theme-option-icon" />
                    <div className="theme-option-text">
                      <span className="theme-option-name">{t.name}</span>
                      <span className="theme-option-desc">{t.description}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="theme-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
