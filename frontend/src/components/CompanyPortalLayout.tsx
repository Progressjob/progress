import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { employerApi } from '../api/employer';
import { ProgressLogo } from './ProgressLogo';
import { AdminContactCard } from './AdminContactCard';

export const CompanyPortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams<{ companyId?: string }>();
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (companies.length === 0) return true;
    if (!companyId || !company) return true;
    if (company.verificationStatus !== 'verified') return true;
    if (!company.canSelfPublishJobs) return true;
    return jobs.some((j) => j.status === 'rejected');
  }, [companies.length, companiesQuery.isLoading, company, companyId, jobs]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: {} });
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
            <NavLink to="/company" end>
              Companies
            </NavLink>
            {companyId && (
              <>
                <NavLink to={`/company/${companyId}/jobs`}>Job postings</NavLink>
                <NavLink to={`/company/${companyId}/jobs/new`}>Post opportunity</NavLink>
              </>
            )}
          </nav>

          <div className="nav-auth">
            {user && (
              <div className="user-pill">
                <span className="user-pill-name">
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>(company)</small>
                </span>
                <button type="button" className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
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
          © {new Date().getFullYear()} Progress Manpower — Companies portal
        </p>
      </footer>
    </div>
  );
};
