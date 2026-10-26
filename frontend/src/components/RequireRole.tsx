import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface RequireRoleProps {
  roles: string[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, loading, hasRole, logout, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  if (loading) {
    return <div className="card" style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasRole(...roles)) {
    const handleSwitchAccount = async () => {
      await logout();
      navigate('/login', { replace: true, state: {} });
    };

    const handleQuickDemoSwitch = async (email: string, pass: string, targetPath: string) => {
      setSwitching(true);
      try {
        await login(email, pass);
        navigate(targetPath, { replace: true });
      } catch {
        await logout();
        navigate('/login', { replace: true, state: {} });
      } finally {
        setSwitching(false);
      }
    };

    return (
      <div
        className="card alert-error"
        style={{
          maxWidth: '620px',
          margin: '3.5rem auto',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#b91c1c' }}>
          403 — Access Denied
        </h2>
        <p style={{ margin: '0 0 0.5rem', lineHeight: 1.5 }}>
          You are currently signed in as <strong>{user.email}</strong> with role(s):{' '}
          <code>{user.roles.join(', ') || 'none'}</code>.
        </p>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.92rem' }}>
          This section requires: <code>{roles.join(' or ')}</code> privileges.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-auth-submit"
            onClick={handleSwitchAccount}
            style={{ width: 'auto', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            Sign Out / Switch Account
          </button>
          <Link
            to={user.roles.includes('admin') ? '/admin' : user.roles.includes('employer') ? '/company' : '/jobs'}
            className="btn-clear-filters"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Go to Your Dashboard
          </Link>
        </div>

        {/* Quick demo transit options to easily recover */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #fee2e2' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: '0.5rem' }}>
            Quick Demo Switch:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {roles.includes('admin') && (
              <button
                type="button"
                className="dev-chip"
                disabled={switching}
                onClick={() => handleQuickDemoSwitch('admin@example.com', 'ChangeMe123!', '/admin')}
                style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                {switching ? 'Switching…' : 'Switch to Admin Demo ⚡'}
              </button>
            )}
            {roles.includes('employer') && (
              <button
                type="button"
                className="dev-chip"
                disabled={switching}
                onClick={() => handleQuickDemoSwitch('employer@example.com', 'Employer123!', '/company')}
                style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                {switching ? 'Switching…' : 'Switch to Companies Demo ⚡'}
              </button>
            )}
            {roles.includes('candidate') && (
              <button
                type="button"
                className="dev-chip"
                disabled={switching}
                onClick={() => handleQuickDemoSwitch('candidate@example.com', 'Candidate123!', '/jobs')}
                style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                {switching ? 'Switching…' : 'Switch to Candidate Demo ⚡'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
