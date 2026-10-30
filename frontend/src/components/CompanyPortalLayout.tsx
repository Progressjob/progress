import { AccountDropdown } from './AccountDropdown';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  isCompanyCvSearch,
  isCompanyEditJob,
  isCompanyJobsList,
  isCompanyPostJob,
  isExactPath,
  navActive,
} from '../auth/nav';
import { employerProfileEditPath } from '../auth/workspace';
import { employerApi } from '../api/employer';
import { ProgressLogo } from './ProgressLogo';
import { AdminContactCard } from './AdminContactCard';

export const CompanyPortalLayout: React.FC = () => {
  const { user, logout, setWorkspace, enableCandidate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams<{ companyId?: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
  });

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobsQuery = useQuery({
    queryKey: ['company', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-locked', menuOpen);
    return () => document.body.classList.remove('nav-locked');
  }, [menuOpen]);

  const companies = companiesQuery.data ?? [];
  const company = companyQuery.data;
  const jobs = jobsQuery.data ?? [];

  const showAdminContact = useMemo(() => {
    if (companiesQuery.isLoading) return false;
    if (companies.length === 0) return false;
    if (company?.verificationStatus === 'rejected') return true;
    return jobs.some((j) => j.status === 'rejected');
  }, [companies.length, companiesQuery.isLoading, company, jobs]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: {} });
  };

  const handleFindWork = async () => {
    setSwitching(true);
    try {
      if (!user?.roles.includes('candidate')) {
        await enableCandidate();
      }
      setWorkspace('candidate');
      navigate('/jobs');
    } finally {
      setSwitching(false);
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
          aria-controls="employer-nav-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <div className={`nav-overlay ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
        <div id="employer-nav-panel" className={`nav-panel ${menuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links" aria-label="Employer navigation">
            <NavLink to="/">Home</NavLink>
            {companyId ? (
              <>
                <NavLink
                  to={`/company/${companyId}/jobs`}
                  end
                  className={() =>
                    navActive(
                      isCompanyJobsList(location.pathname, companyId) ||
                        isCompanyEditJob(location.pathname, companyId),
                    )
                  }
                >
                  Job postings
                </NavLink>
                <NavLink
                  to={`/company/${companyId}/jobs/new`}
                  end
                  className={() => navActive(isCompanyPostJob(location.pathname, companyId))}
                >
                  Post a job
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/company"
                end
                className={() => navActive(isExactPath(location.pathname, '/company'))}
              >
                Hiring home
              </NavLink>
            )}
            <NavLink
              to={
                companyId
                  ? `/company/${companyId}/cv-search`
                  : companies[0]
                    ? `/company/${companies[0].id}/cv-search`
                    : '/company'
              }
              className={() => navActive(isCompanyCvSearch(location.pathname, companyId))}
            >
              CV search
            </NavLink>
          </nav>

          <div className="nav-auth">
            {user && (
              <>
                <AccountDropdown name={`${user.firstName} ${user.lastName}`} subtitle="Employer account">
                  <p className="nav-account-heading">Hiring workspace</p>
                  <NavLink to={companyId ? employerProfileEditPath(companyId) : companies[0] ? employerProfileEditPath(companies[0].id) : '/employer/setup'}>Company profile</NavLink>
                  <NavLink to={companyId ? `/company/${companyId}/jobs` : '/company'}>Manage posted jobs</NavLink>
                  <Link to="/">Homepage</Link>
                  <Link to="/contact">Contact support</Link>
                  <div className="nav-account-separator" />
                  <button type="button" onClick={() => void handleFindWork()} disabled={switching}>
                    {switching ? 'Switching…' : 'Switch to finding work'}
                  </button>
                  <button type="button" className="nav-account-logout" onClick={handleLogout}>Sign out</button>
                </AccountDropdown>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-container">
        <Outlet />
        {showAdminContact && <AdminContactCard />}
      </main>

      <footer className="site-footer" style={{ padding: '1rem 2rem' }}>
        <p style={{ margin: 0, textAlign: 'center', opacity: 0.85 }}>
          © {new Date().getFullYear()} Progress Manpower — Employer
        </p>
      </footer>
    </div>
  );
};
