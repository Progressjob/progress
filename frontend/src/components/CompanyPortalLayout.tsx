import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  isCompanyEditJob,
  isCompanyJobsList,
  isCompanyPostJob,
  isExactPath,
  navActive,
} from '../auth/nav';
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
          <Link to="/company" className="brand-logo-link">
            <ProgressLogo size="sm" />
          </Link>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <div className={`nav-panel ${menuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links">
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
          </nav>

          <div className="nav-auth">
            {user && (
              <>
                <button
                  type="button"
                  className="nav-switch-mode"
                  onClick={() => void handleFindWork()}
                  disabled={switching}
                >
                  {switching ? 'Switching…' : 'Switch to finding work'}
                </button>
                <div className="user-pill">
                  <span className="user-pill-name">
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>Hiring</small>
                  </span>
                  <button type="button" className="btn-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
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
