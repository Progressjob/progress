import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { useAuth } from '../auth/AuthContext';
import { isAdminCvSearch, isExactPath, isSectionPath, navActive } from '../auth/nav';
import { ProgressLogo } from './ProgressLogo';

export const AdminPortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
    refetchInterval: 60_000,
  });
  const pendingReviewJobs = pendingQuery.data?.pendingReviewJobs ?? 0;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: {} });
  };

  return (
    <div className="app-shell">
      <header className={`top-nav ${menuOpen ? 'is-menu-open' : ''}`}>
        <div className="nav-brand">
          <Link to="/admin" className="brand-logo-link">
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
            <NavLink
              to="/admin"
              end
              className={() => navActive(isExactPath(location.pathname, '/admin'))}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/companies"
              end
              className={() => navActive(isExactPath(location.pathname, '/admin/companies'))}
            >
              Companies
            </NavLink>
            <NavLink
              to={pendingReviewJobs > 0 ? '/admin/jobs?status=pending_review' : '/admin/jobs'}
              className={() => navActive(isSectionPath(location.pathname, '/admin/jobs'))}
            >
              Jobs{pendingReviewJobs > 0 ? ` (${pendingReviewJobs})` : ''}
            </NavLink>
            <NavLink
              to="/admin/candidates"
              end
              className={() => navActive(isExactPath(location.pathname, '/admin/candidates'))}
            >
              Candidates
            </NavLink>
            <NavLink
              to="/admin/cv-search"
              className={() => navActive(isAdminCvSearch(location.pathname))}
            >
              CV search
            </NavLink>
          </nav>

          <div className="nav-auth">
            {user && (
              <div className="user-pill">
                <span className="user-pill-name">
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>(admin)</small>
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
      </main>

      <footer className="site-footer" style={{ padding: '1rem 2rem' }}>
        <p style={{ margin: 0, textAlign: 'center', opacity: 0.85 }}>
          © {new Date().getFullYear()} Progress Manpower — Admin portal
        </p>
      </footer>
    </div>
  );
};
