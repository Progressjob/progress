import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ProgressLogo } from './ProgressLogo';

export const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-locked', menuOpen);
    return () => document.body.classList.remove('nav-locked');
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true, state: {} });
  };

  return (
    <div className="app-shell">
      <header className={`top-nav ${menuOpen ? 'is-menu-open' : ''}`}>
        <div className="nav-brand">
          <Link to="/" className="brand-logo-link">
            <ProgressLogo size="sm" />
          </Link>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-nav-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <div
          className={`nav-overlay ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        <div id="site-nav-panel" className={`nav-panel ${menuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/jobs">Find Jobs</NavLink>
            <NavLink to="/companies">Companies</NavLink>
            <NavLink to="/contact">Contact</NavLink>

            {hasRole('candidate') && (
              <>
                <span className="nav-divider">|</span>
                <NavLink to="/candidate/profile">My Profile</NavLink>
                <NavLink to="/candidate/resumes">My CVs</NavLink>
                <NavLink to="/candidate/applications">My Applications</NavLink>
              </>
            )}

            {hasRole('employer') && (
              <>
                <span className="nav-divider">|</span>
                <NavLink to="/company">Companies portal</NavLink>
              </>
            )}

            {hasRole('admin', 'moderator') && (
              <>
                <span className="nav-divider">|</span>
                <NavLink to="/admin">Admin portal</NavLink>
              </>
            )}
          </nav>

          <div className="nav-auth">
            {user ? (
              <div className="user-pill">
                <div className="user-avatar-initial">
                  {user.firstName?.charAt(0) || 'U'}
                </div>
                <span className="user-pill-name">
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>({user.roles.join(', ')})</small>
                </span>
                <button type="button" className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn-nav-login">
                  Sign In
                </Link>
                <Link to="/register" className="btn-nav-register">
                  <span>Get Started</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-container">
        <Outlet />
      </main>

      {/* Corporate Footer */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <ProgressLogo variant="white" size="md" />
            <p className="footer-tagline">
              "We understand that talent drives your business strategy and we make it our business to
              find that talent."
            </p>
            <p className="footer-quote">"We handpick the best among the rest"</p>
            <div className="footer-license-badge">
              Licensed, certified & registered O/R/ G/Labor & Social Affairs Bureau
            </div>
          </div>

          <div className="footer-links-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/jobs">Browse Jobs</Link>
              </li>
              <li>
                <Link to="/companies">Partner Companies</Link>
              </li>
              <li>
                <Link to="/contact">Contact Dukem HQ</Link>
              </li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Portals</h4>
            <ul>
              <li>
                <Link to="/register">Candidate Registration</Link>
              </li>
              <li>
                <Link to="/login">Account Sign In</Link>
              </li>
              <li>
                <Link to="/company">Companies portal</Link>
              </li>
              <li>
                <Link to="/admin">Admin portal</Link>
              </li>
            </ul>
          </div>

          <div className="footer-contact-col">
            <h4>Headquarters & Contact</h4>
            <div className="contact-item">
              <strong>Location:</strong> Dukem, Oromia Region, Ethiopia
            </div>
            <div className="contact-item">
              <strong>Telephone:</strong> +251 11 887 9710
            </div>
            <div className="contact-item">
              <strong>Mobile / Hotline:</strong> +251 949 811 818 / +251 994 251 515
            </div>
            <div className="contact-item">
              <strong>Email:</strong> progressjobs8@gmail.com
            </div>
            <div className="contact-item">
              <strong>Web:</strong> progressjobsplc.com
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Progress Manpower Supply & Training PLC. All rights reserved.</p>
          <div className="footer-legal-links">
            <Link to="/contact">Privacy Policy</Link>
            <span>•</span>
            <Link to="/contact">Terms of Service</Link>
            <span>•</span>
            <Link to="/contact">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

