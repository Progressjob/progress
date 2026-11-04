import { AccountDropdown } from './AccountDropdown';
import { NotificationBell } from './NotificationBell';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isExactPath, isPublicCvSearch, isSectionPath, navActive } from '../auth/nav';
import { employerHomeDestination, employerProfileEditPath, hiringDestination } from '../auth/workspace';
import { ProgressLogo } from './ProgressLogo';
import { WorkspaceSwitch } from './WorkspaceSwitch';

export const Layout: React.FC = () => {
  const { user, logout, hasRole, workspace, setWorkspace, enableCandidate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const firstCompanyId = user?.companyMemberships[0]?.companyId;
  const hasEmployerAccount = Boolean(user && firstCompanyId && hasRole('employer'));
  const hasEmployerAccess = Boolean(user && (firstCompanyId || hasRole('employer')));
  const hasBothAccounts = Boolean(user && hasRole('candidate') && hasEmployerAccount);
  const showingEmployer = hasEmployerAccount && workspace === 'employer';
  const profileTo =
    showingEmployer && firstCompanyId
      ? employerProfileEditPath(firstCompanyId)
      : '/candidate/profile';
  const showProfileEdit = Boolean(user && (showingEmployer || hasRole('candidate')));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (user && workspace === 'employer' && !hasEmployerAccount) {
      setWorkspace('candidate');
    }
  }, [user, workspace, hasEmployerAccount, setWorkspace]);

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
    setMenuOpen(false);
    if (firstCompanyId && hasRole('employer')) {
      setWorkspace('employer');
      navigate(`/company/${firstCompanyId}/jobs/new`);
      return;
    }
    navigate(hiringDestination(firstCompanyId));
  };

  const switchToCandidate = () => {
    setWorkspace('candidate');
    setMenuOpen(false);
    navigate('/jobs');
  };

  const switchToEmployer = () => {
    setWorkspace('employer');
    setMenuOpen(false);
    navigate(employerHomeDestination(firstCompanyId));
  };

  return (
    <div className="app-shell">
      <header className={`top-nav ${menuOpen ? 'is-menu-open' : ''}`}>
        <div className="nav-brand">
          <Link to="/" className="brand-logo-link">
            <ProgressLogo size="sm" />
          </Link>
        </div>

        <div className="nav-mobile-actions">
          {user && <NotificationBell />}
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
        </div>

        <div
          className={`nav-overlay ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        <div id="site-nav-panel" className={`nav-panel ${menuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links" aria-label="Main navigation">
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

          </nav>

          <div className="nav-auth">
            {user ? (
              <>
                {!showingEmployer && hasRole('candidate') ? (
                  <Link to="/candidate/applications" className="nav-switch-mode">My applications</Link>
                ) : (
                  <button type="button" className="nav-switch-mode" onClick={handlePostJob}>Post a job</button>
                )}
                {hasBothAccounts && (
                  <WorkspaceSwitch
                    workspace={workspace}
                    onToggle={workspace === 'employer' ? switchToCandidate : switchToEmployer}
                  />
                )}
                <AccountDropdown name={`${user.firstName} ${user.lastName}`} subtitle={showingEmployer ? 'Employer account' : 'My account'}>
                      <p className="nav-account-heading">{showingEmployer ? 'Hiring workspace' : 'Your job search'}</p>
                      {showProfileEdit && <NavLink to={profileTo}>{showingEmployer ? 'Company profile' : 'My profile & CV'}</NavLink>}
                      {hasRole('candidate') && (
                        <>
                          <NavLink to="/candidate/applications">My applications</NavLink>
                          <NavLink to="/candidate/saved-jobs">Saved jobs</NavLink>
                        </>
                      )}
                      {hasEmployerAccount && firstCompanyId && (
                        <NavLink to={`/company/${firstCompanyId}/jobs`} onClick={() => setWorkspace('employer')}>Manage posted jobs</NavLink>
                      )}
                      {hasRole('admin', 'moderator') && <NavLink to="/admin">Admin portal</NavLink>}
                      <Link to="/contact">Contact support</Link>
                      <div className="nav-account-separator" />
                      <button type="button" disabled={switching}
                        onClick={showingEmployer ? handleFindWork : handlePostJob}>
                        {switching ? 'Switching…' : showingEmployer ? 'Switch to finding work' : 'Hire talent / Post a job'}
                      </button>
                      <button type="button" className="nav-account-logout" onClick={handleLogout}>Sign out</button>
                </AccountDropdown>
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

        <div className="mobile-footer-groups">
          <details>
            <summary>Explore & accounts</summary>
            <nav aria-label="Footer navigation">
              <Link to="/jobs">Find jobs</Link>
              <Link to="/companies">Employers</Link>
              <Link to="/register">Create account</Link>
              <Link to="/login">Sign in</Link>
              <Link to={firstCompanyId ? `/company/${firstCompanyId}/jobs/new` : '/employer/setup'}>Post a job</Link>
              <Link to="/admin">Admin portal</Link>
            </nav>
          </details>
          <details>
            <summary>Contact us</summary>
            <p>Dukem, Oromia Region, Ethiopia</p>
            <a href="tel:+251118879710">+251 11 887 9710</a>
            <a href="tel:+251949811818">+251 949 811 818</a>
            <a href="tel:+251994251515">+251 994 251 515</a>
            <a href="mailto:progressjobs8@gmail.com">progressjobs8@gmail.com</a>
            <Link to="/contact">All contact details</Link>
          </details>
          <details>
            <summary>About Progress</summary>
            <p>We handpick the best among the rest.</p>
            <p>Licensed, certified & registered O/R/ G/Labor & Social Affairs Bureau.</p>
          </details>
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

