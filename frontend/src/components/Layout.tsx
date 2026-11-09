import { MenuNotificationBadge } from './MenuNotificationBadge';
import { SiteNavbar } from './SiteNavbar';
import { AccountDropdown } from './AccountDropdown';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isExactPath, isPublicCvSearch, isSectionPath, navActive } from '../auth/nav';
import { employerHomeDestination, employerProfileEditPath, hiringDestination } from '../auth/workspace';
import { ProgressLogo } from './ProgressLogo';
import { WorkspaceSwitch } from './WorkspaceSwitch';

export const Layout: React.FC = () => {
  const { user, restoringSession, logout, hasRole, workspace, setWorkspace, enableCandidate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
    if (!restoringSession && user && workspace === 'employer' && !hasEmployerAccount) {
      setWorkspace('candidate');
    }
  }, [user, workspace, hasEmployerAccount, setWorkspace, restoringSession]);

  const handleLogout = async () => {
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
    if (firstCompanyId && hasRole('employer')) {
      setWorkspace('employer');
      navigate(`/company/${firstCompanyId}/jobs/new`);
      return;
    }
    navigate(hiringDestination(firstCompanyId));
  };

  const switchToCandidate = () => {
    setWorkspace('candidate');
    navigate('/jobs');
  };

  const switchToEmployer = () => {
    setWorkspace('employer');
    navigate(employerHomeDestination(firstCompanyId));
  };

  return (
    <div className="app-shell">
      <SiteNavbar label="Main navigation"
        unreadScopes={showingEmployer ? [{ referenceType: 'candidates', referenceId: firstCompanyId }, { referenceType: 'job' }] : []}
        account={<>
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
                <AccountDropdown name={`${user.firstName} ${user.lastName}`} subtitle={showingEmployer ? 'Employer account' : 'My account'}
                  unreadScopes={[
                    ...(hasRole('candidate') && !showingEmployer ? [{ referenceType: 'application' }] : []),
                    ...(hasEmployerAccount ? [{ referenceType: 'candidates', referenceId: firstCompanyId }, { referenceType: 'job' }] : []),
                  ]}>
                      <p className="nav-account-heading">{showingEmployer ? 'Hiring workspace' : 'Your job search'}</p>
                      {showProfileEdit && <NavLink to={profileTo}>{showingEmployer ? 'Company profile' : 'My profile & CV'}</NavLink>}
                      {hasRole('candidate') && !showingEmployer && (
                        <>
                          <NavLink to="/candidate/applications">My applications<MenuNotificationBadge references={['application']} /></NavLink>
                          <NavLink to="/candidate/saved-jobs">Saved jobs</NavLink>
                        </>
                      )}
                      {hasRole('candidate') && showingEmployer && (
                        <NavLink to="/candidate/saved-jobs" onClick={() => setWorkspace('candidate')}>Saved jobs</NavLink>
                      )}
                      {hasEmployerAccount && firstCompanyId && (
                        <NavLink to={`/company/${firstCompanyId}/jobs`} onClick={() => setWorkspace('employer')}>Hiring workspace<MenuNotificationBadge scopes={[{ referenceType: 'candidates', referenceId: firstCompanyId }, { referenceType: 'job' }]} /></NavLink>
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
            ) : restoringSession ? (
              <div className="mobile-guest-account" aria-busy="true" aria-label="Restoring session">
                <AccountDropdown name="…" subtitle="Restoring session">
                  <p className="nav-account-heading">Restoring your session…</p>
                </AccountDropdown>
              </div>
            ) : (
              <>
              <div className="mobile-guest-account">
                <AccountDropdown name="Guest" subtitle="Account">
                  <Link to="/login">Sign in</Link>
                  <Link to="/register">Create account</Link>
                </AccountDropdown>
              </div>
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
              </>
            )}
      </>}>
            {showingEmployer ? (
              <>
                <NavLink to={`/company/${firstCompanyId}/jobs`}>Job postings<MenuNotificationBadge references={['job']} /></NavLink>
                <NavLink to={`/company/${firstCompanyId}/jobs/new`}>Post a job</NavLink>
                <NavLink to={`/company/${firstCompanyId}/candidates`}>Review candidates<MenuNotificationBadge scopes={[{ referenceType: 'candidates', referenceId: firstCompanyId }]} /></NavLink>
                <NavLink to={`/company/${firstCompanyId}/cv-search`}>CV search</NavLink>
                <NavLink to="/">Home</NavLink>
              </>
            ) : (
              <>
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


              </>
            )}

      </SiteNavbar>

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
                <Link to="/contact">Contact Bishoftu HQ</Link>
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
              <strong>Location:</strong> Bishoftu, Oromia Region, Ethiopia
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
          <div className="mobile-footer-columns">
            <div className="mobile-footer-col">
              <h4 className="mobile-footer-title">Explore</h4>
              <nav className="mobile-footer-nav" aria-label="Footer navigation">
                <Link to="/jobs">Find jobs</Link>
                <Link to="/companies">Employers</Link>
                <Link to={firstCompanyId ? `/company/${firstCompanyId}/jobs/new` : '/employer/setup'}>Post a job</Link>
                <Link to="/login">Sign in</Link>
                <Link to="/admin">Admin portal</Link>
              </nav>
            </div>

            <div className="mobile-footer-col">
              <h4 className="mobile-footer-title">Contact HQ</h4>
              <div className="mobile-footer-contact">
                <span className="mobile-footer-loc">Bishoftu, Oromia</span>
                <a href="tel:+251949811818">+251 949 811 818</a>
                <a href="mailto:progressjobs8@gmail.com" className="mobile-footer-email">progressjobs8@gmail.com</a>
                <Link to="/contact" className="mobile-footer-more-contact">All details →</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Progress Jobs. All rights reserved.</p>
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

