import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../api/support';
import { useAuth } from '../auth/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => supportApi.health(),
    refetchInterval: 30_000,
    retry: 1,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="nav-brand">
          <Link to="/jobs" className="brand-title">
            Ethiojobs Harness
          </Link>
          <span
            className={`health-badge ${
              healthQuery.isSuccess
                ? 'health-ok'
                : healthQuery.isError
                  ? 'health-err'
                  : 'health-wait'
            }`}
            title={
              healthQuery.data?.timestamp
                ? `Last check: ${healthQuery.data.timestamp}`
                : 'Backend /api/v1/health status'
            }
          >
            API: {healthQuery.isSuccess ? 'OK' : healthQuery.isError ? 'OFFLINE' : '...'}
          </span>
        </div>

        <nav className="nav-links">
          <NavLink to="/jobs">Jobs</NavLink>
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
              <NavLink to="/employer">Employer Portal</NavLink>
            </>
          )}

          {hasRole('admin', 'moderator') && (
            <>
              <span className="nav-divider">|</span>
              <NavLink to="/admin">Admin Dashboard</NavLink>
              <NavLink to="/admin/jobs">Admin Jobs</NavLink>
            </>
          )}
        </nav>

        <div className="nav-auth">
          {user ? (
            <div className="user-pill">
              <span>
                <strong>
                  {user.firstName} {user.lastName}
                </strong>{' '}
                <small>({user.roles.join(', ')})</small>
              </span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-sm btn-secondary">
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="main-container">
        <Outlet />
      </main>
    </div>
  );
};
