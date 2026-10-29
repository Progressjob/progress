import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { isExactPath, isPublicCvSearch, isSectionPath, navActive } from '../auth/nav';
import { hiringDestination } from '../auth/workspace';
import { candidateApi } from '../api/candidate';
import { ProgressLogo } from './ProgressLogo';

export const Layout: React.FC = () => {
  const { user, logout, hasRole, workspace, setWorkspace, enableCandidate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const firstCompanyId = user?.companyMemberships[0]?.companyId;
  const hasEmployerAccess = Boolean(user && (firstCompanyId || hasRole('employer')));
  const inCandidateWorkspace = !user || workspace === 'candidate';
  const showProfileEntry = Boolean(user && inCandidateWorkspace && hasRole('candidate'));
  const profileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
    enabled: showProfileEntry,
  });
  const profile = profileQuery.data;
  const profileStarted = Boolean(
    profile?.photoFileId ||
    profile?.summary?.trim() ||
    profile?.city ||
    profile?.region ||
    profile?.educations?.length ||
    profile?.experiences?.length ||
    profile?.skills?.length ||
    profile?.certifications?.length ||
    profile?.languages?.length ||
    profile?.resumes?.length,
  );

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

  const handleFindWork = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/jobs' } });
      return;
    }
    setSwitching(true);
    try {
      if (!hasRole('candidate')) {
        await enableCandidate();
      }
      setWorkspace('candidate');
      setMenuOpen(false);
      navigate('/jobs');
    } finally {
      setSwitching(false);
    }
  };

  const handlePostJob = () => {
    if (!user) {
      navigate('/login', { state: { from: '/employer/setup' } });
      return;
    }
    setWorkspace('employer');
    setMenuOpen(false);
    if (firstCompanyId) {
      navigate(`/company/${firstCompanyId}/jobs/new`);
    } else {
      navigate(hiringDestination(firstCompanyId));
    }
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
            <NavLink
              to="/"
              end
              className={() => navActive(isExactPath(location.pathname, '/'))}
            >
              Home
            </NavLink>
            <NavLink
              to="/jobs"
              end
              className={() => navActive(isSectionPath(location.pathname, '/jobs'))}
            >
              Find Jobs
            </NavLink>
            <NavLink
              to="/companies"
              className={() => navActive(isSectionPath(location.pathname, '/companies'))}
            >
              Employers
            </NavLink>
            <NavLink
              to="/cv-search"
              className={() => navActive(isPublicCvSearch(location.pathname))}
            >
              CV search
            </NavLink>
            <NavLink
              to="/contact"
              end
              className={() => navActive(isExactPath(location.pathname, '/contact'))}
            >
              Contact
            </NavLink>

            {hasEmployerAccess && (
              <NavLink
                to={firstCompanyId ? `/company/${firstCompanyId}/jobs` : '/company'}
                className={() => navActive(location.pathname.startsWith('/company'))}
                title="Track your posted jobs and view post record"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 600,
                  color: '#0284c7',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" strokeWidth="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
                </svg>
                <span>Track Posted Jobs</span>
              </NavLink>
            )}

            {hasRole('admin', 'moderator') && (
              <>
                <span className="nav-divider">|</span>
                <NavLink
                  to="/admin"
                  end
                  className={() => navActive(isExactPath(location.pathname, '/admin'))}
                >
                  Admin portal
                </NavLink>
              </>
            )}
          </nav>

          <div className="nav-auth">
            {user ? (
              <>
                <button
                  type="button"
                  className="nav-switch-mode"
                  onClick={workspace === 'employer' ? handleFindWork : handlePostJob}
                  disabled={switching}
                >
                  {switching
                    ? 'Switching…'
                    : workspace === 'employer'
                      ? 'Switch to finding work'
                      : hasEmployerAccess
                        ? '+ Post Vacancy'
                        : 'Post a job'}
                </button>
                {showProfileEntry && (
                  <NavLink
                    to="/candidate/profile"
                    className={() =>
                      `btn-nav-profile${isSectionPath(location.pathname, '/candidate') ? ' is-active' : ''}`
                    }
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="9" cy="7" r="4" strokeWidth="2" />
                      {profileStarted ? null : (
                        <path d="M19 8v6M22 11h-6" strokeWidth="2" strokeLinecap="round" />
                      )}
                    </svg>
                    <span>{profileStarted ? 'Profile' : 'Create profile'}</span>
                  </NavLink>
                )}
                <div className="user-pill">
                  <div className="user-avatar-initial">
                    {user.firstName?.charAt(0) || 'U'}
                  </div>
                  <span className="user-pill-name">
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>
                      {workspace === 'employer' ? 'Hiring' : 'Looking for work'}
                    </small>
                  </span>
                  <button type="button" className="btn-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </>
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
                <Link to="/companies">Partner Employers</Link>
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
                <Link to="/register">Create account</Link>
              </li>
              <li>
                <Link to="/login">Account Sign In</Link>
              </li>
              <li>
                <Link to={firstCompanyId ? `/company/${firstCompanyId}/jobs/new` : '/employer/setup'}>
                  Post a job
                </Link>
              </li>
              {hasEmployerAccess && (
                <li>
                  <Link to={firstCompanyId ? `/company/${firstCompanyId}/jobs` : '/company'}>
                    Track Posted Jobs
                  </Link>
                </li>
              )}
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

