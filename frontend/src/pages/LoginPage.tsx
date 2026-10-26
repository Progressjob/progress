import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ProgressLogo } from '../components/ProgressLogo';

export function getValidRedirect(from: string | null | undefined, roles: string[]): string {
  if (from) {
    const isPublic =
      from === '/' ||
      from === '/jobs' ||
      (from.startsWith('/jobs/') && !from.endsWith('/apply')) ||
      from === '/companies' ||
      from.startsWith('/companies/') ||
      from === '/contact';

    if (isPublic) {
      return from;
    }

    if (from.startsWith('/admin') && (roles.includes('admin') || roles.includes('moderator'))) {
      return from;
    }

    if (
      (from.startsWith('/company') || from.startsWith('/employer')) &&
      roles.includes('employer')
    ) {
      return from;
    }

    if (
      (from.startsWith('/candidate') || from.endsWith('/apply')) &&
      roles.includes('candidate')
    ) {
      return from;
    }
  }

  // Fallback to role-specific default portal
  if (roles.includes('admin') || roles.includes('moderator')) {
    return '/admin';
  }
  if (roles.includes('employer')) {
    return '/company';
  }
  return '/jobs';
}

export const LoginPage: React.FC = () => {
  const { user: currentUser, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showDevAccounts, setShowDevAccounts] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      const target = getValidRedirect(from, user.roles);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loginAsDemo = async (demoEmail: string, demoPass: string, label: string) => {
    setIdentifier(demoEmail);
    setPassword(demoPass);
    setError(null);
    setSubmitting(true);
    setActiveDemo(label);
    try {
      const user = await login(demoEmail, demoPass);
      // When explicitly clicking a demo profile, clear mismatched 'from' and go to that role's home
      const target = getValidRedirect(null, user.roles);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
      setActiveDemo(null);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-card-brand">
          <ProgressLogo size="md" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to access your jobs, applications, or companies portal</p>

        {currentUser && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              Signed in: <strong>{currentUser.email}</strong> ({currentUser.roles.join(', ')})
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 0.25rem',
              }}
            >
              Log out
            </button>
          </div>
        )}

        {error && <div className="alert-box-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-input-group">
            <label htmlFor="login-id">Email Address or Phone</label>
            <div className="auth-input-wrapper">
              <svg className="auth-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                <polyline points="22,6 12,13 2,6" strokeWidth="2" />
              </svg>
              <input
                id="login-id"
                type="text"
                required
                placeholder="name@example.com or +251..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          <div className="form-input-group">
            <label htmlFor="login-pass">Password</label>
            <div className="auth-input-wrapper">
              <svg className="auth-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
              </svg>
              <input
                id="login-pass"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Don't have an account yet?</span>
          <Link to="/register" className="auth-link">
            Register as Candidate
          </Link>
        </div>

        {/* Discreet Seed Account Accordion for Testing */}
        <div className="dev-accounts-toggle-wrap">
          <button
            type="button"
            className="btn-toggle-dev"
            onClick={() => setShowDevAccounts((prev) => !prev)}
          >
            <span>{showDevAccounts ? 'Hide Demo Logins ▲' : 'Demo Test Accounts ▼'}</span>
          </button>

          {showDevAccounts && (
            <div className="dev-accounts-chip-grid">
              <button
                type="button"
                className="dev-chip"
                disabled={submitting}
                onClick={() => loginAsDemo('candidate@example.com', 'Candidate123!', 'candidate')}
                title="Click to sign in instantly as Candidate"
              >
                {activeDemo === 'candidate' ? 'Signing in…' : 'Candidate Demo ⚡'}
              </button>
              <button
                type="button"
                className="dev-chip"
                disabled={submitting}
                onClick={() => loginAsDemo('employer@example.com', 'Employer123!', 'employer')}
                title="Click to sign in instantly as Employer"
              >
                {activeDemo === 'employer' ? 'Signing in…' : 'Companies Demo ⚡'}
              </button>
              <button
                type="button"
                className="dev-chip"
                disabled={submitting}
                onClick={() => loginAsDemo('admin@example.com', 'ChangeMe123!', 'admin')}
                title="Click to sign in instantly as Admin"
              >
                {activeDemo === 'admin' ? 'Signing in…' : 'Admin Demo ⚡'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
