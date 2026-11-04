import { SiteNavbar } from './SiteNavbar';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AccountDropdown } from './AccountDropdown';
import { NotificationBell } from './NotificationBell';

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

  return (
    <div className="app-shell admin-shell">
      <SiteNavbar label="Admin navigation" admin account={<>
            {user && <NotificationBell />}
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
      </>}>
            {primaryLinks.map(([label, href]) => (
              <NavLink key={href} to={href} end={href === '/admin'}>{label}</NavLink>
            ))}

      </SiteNavbar>
      <main className="main-container admin-content">
        <Outlet />
      </main>
    </div>
  );
};
