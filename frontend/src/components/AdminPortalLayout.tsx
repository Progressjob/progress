import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ProgressLogo } from './ProgressLogo';
import { AccountDropdown } from './AccountDropdown';

const primaryLinks = [
  ['Dashboard', '/admin'],
  ['Companies', '/admin/companies'],
  ['Jobs', '/admin/jobs'],
  ['Candidates', '/admin/candidates'],
  ['Taxonomy', '/admin/taxonomy'],
];

export const AdminPortalLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    document.body.classList.toggle('nav-locked', menuOpen);
    return () => document.body.classList.remove('nav-locked');
  }, [menuOpen]);

  return (
    <div className="app-shell admin-shell">
      <header className={`top-nav admin-topbar ${menuOpen ? 'is-menu-open' : ''}`}>
        <Link to="/admin" className="brand-logo-link" aria-label="Admin dashboard">
          <ProgressLogo size="sm" />
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-panel"
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
        <div id="admin-nav-panel" className={`nav-panel ${menuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links admin-primary-nav" aria-label="Admin navigation">
            {primaryLinks.map(([label, href]) => (
              <NavLink key={href} to={href} end={href === '/admin'}>{label}</NavLink>
            ))}
          </nav>
          <div className="nav-auth">
            {user && (
              <AccountDropdown
                name={`${user.firstName} ${user.lastName}`}
                subtitle={user.roles.includes('admin') ? 'Administrator' : 'Moderator'}
              >
                <p className="nav-account-heading">Review & manage</p>
                <NavLink to="/admin/verification">Employer verification</NavLink>
                <NavLink to="/admin/cv-search">CV search</NavLink>
                <div className="nav-account-separator" />
                <p className="nav-account-heading">Communication</p>
                <NavLink to="/admin/support">Support inbox</NavLink>
                <NavLink to="/admin/notifications">Notifications</NavLink>
                <div className="nav-account-separator" />
                <Link to="/">View public website</Link>
                <button type="button" className="nav-account-logout" onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}>Sign out</button>
              </AccountDropdown>
            )}
          </div>
        </div>
      </header>
      <main className="main-container admin-content">
        <Outlet />
      </main>
    </div>
  );
};
