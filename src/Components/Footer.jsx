import './Footer.css';
import { Mail, Heart, Globe } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import { getUserTimeZone } from '../utils/timeUtils';

const Footer = () => {
  const timeZone = getUserTimeZone();

  return (
    <footer className="footer-container">
      <div className="footer-inner">
        {/* Brand & Description */}
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">⚡ NextContest</div>
            <p className="footer-tagline">
              Real-time competitive programming contest aggregator. Stay ahead of every contest with zero confusion.
            </p>
            <div className="footer-tz-badge">
              <Globe size={13} />
              <span>Times automatically rendered for {timeZone}</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div className="footer-links-group">
            <h4 className="footer-heading">Platforms</h4>
            <div className="footer-links-list">
              <a href="https://leetcode.com/contest/" target="_blank" rel="noopener noreferrer">
                🟡 LeetCode Contests
              </a>
              <a href="https://codeforces.com/contests" target="_blank" rel="noopener noreferrer">
                🟢 Codeforces Contests
              </a>
              <a href="https://www.codechef.com/contests" target="_blank" rel="noopener noreferrer">
                🔴 CodeChef Contests
              </a>
            </div>
          </div>

          {/* Connect & Social */}
          <div className="footer-links-group">
            <h4 className="footer-heading">Connect</h4>
            <div className="footer-social-links">
              <a 
                href="https://github.com/gyanendra00008/NextContest" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-btn"
                title="GitHub"
              >
                <GithubIcon size={16} />
                <span>GitHub</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/gyanendra-kumar-2138b23a2/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-btn"
                title="LinkedIn"
              >
                <LinkedinIcon size={16} />
                <span>LinkedIn</span>
              </a>
              <a 
                href="mailto:gk154866@gmail.com" 
                className="social-btn"
                title="Contact Email"
              >
                <Mail size={16} />
                <span>Contact</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="copyright-text">
            © {new Date().getFullYear()} NextContest. Open source for competitive programmers.
          </p>
          <div className="made-with">
            <span>Crafted with</span>
            <Heart size={14} className="heart-icon" />
            <span>by Gyanendra Kumar</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
