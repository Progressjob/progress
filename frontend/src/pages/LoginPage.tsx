import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredWorkspace,
  setStoredWorkspace,
  type Workspace,
} from '../auth/workspace';
import { ApiError } from '../api/client';
import { GoogleContinueButton } from '../components/GoogleContinueButton';
import { ProgressLogo } from '../components/ProgressLogo';

function isPublicReturnPath(from: string): boolean {
  return (
    from === '/' ||
    from === '/jobs' ||
    from === '/cv-search' ||
    from.startsWith('/cv-search/') ||
    (from.startsWith('/jobs/') && !from.endsWith('/apply')) ||
    from === '/contact' ||
    from === '/companies' ||
    from.startsWith('/companies/')
  );
}

/**
 * Pick post-login destination.
 * Dual-role accounts (candidate + employer) must respect workspace preference —
 * otherwise Candidate Demo lands on employer job postings after hire-mode was enabled once.
 */
export function getValidRedirect(
  from: string | null | undefined,
  roles: string[],
  workspace: Workspace | null = getStoredWorkspace(),
): string {
  const isAdmin = roles.includes('admin') || roles.includes('moderator');
  const isEmployer = roles.includes('employer');
  const isCandidate = roles.includes('candidate');

  if (isAdmin) {
    if (from?.startsWith('/admin')) return from;
    return '/admin';
  }

  const fromIsEmployer = Boolean(from && (from.startsWith('/company') || from.startsWith('/employer')));
  const fromIsCandidate = Boolean(
    from && (from.startsWith('/candidate') || from.endsWith('/apply')),
  );

  // Dual-role: follow explicit return path, else active workspace (default candidate).
  if (isEmployer && isCandidate) {
    if (fromIsEmployer) return from!;
    if (fromIsCandidate) return from!;
    if (from && isPublicReturnPath(from)) return from;

    if (workspace === 'employer') return '/company';
    return '/jobs';
  }

  if (isEmployer) {
    if (fromIsEmployer) return from!;
    return '/company';
  }

  if (fromIsCandidate && isCandidate) return from!;
  if (from && isPublicReturnPath(from)) return from;

  return '/jobs';
}

function applyWorkspaceForLogin(roles: string[], preferred?: Workspace | null): Workspace {
  const isEmployer = roles.includes('employer');
  const isCandidate = roles.includes('candidate');

  if (preferred === 'employer' && isEmployer) return 'employer';
  if (preferred === 'candidate' && isCandidate) return 'candidate';

  // Employer-only accounts always open hiring.
  if (isEmployer && !isCandidate) return 'employer';
  // Candidate-only (or dual-role without preference) stay in job-seeker mode.
  return 'candidate';
}

export const LoginPage: React.FC = () => {
  const { user: currentUser, login, loginWithGoogle, logout, setWorkspace } = useAuth();
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
      const nextWorkspace = applyWorkspaceForLogin(user.roles, getStoredWorkspace());
      setStoredWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
      const target = getValidRedirect(from, user.roles, nextWorkspace);
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

  const handleGoogle = async (idToken: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const { user, isNew } = await loginWithGoogle(idToken);
      const nextWorkspace = applyWorkspaceForLogin(user.roles, getStoredWorkspace());
      setStoredWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
      const target = isNew
        ? '/candidate/profile?edit=1&welcome=1'
        : getValidRedirect(from, user.roles, nextWorkspace);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Google sign-in failed.');
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
      // Demo chips force the intended workspace even if the account also has the other role.
      const preferred: Workspace | null =
        label === 'employer' ? 'employer' : label === 'candidate' ? 'candidate' : null;
      const nextWorkspace = applyWorkspaceForLogin(user.roles, preferred);
      setStoredWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);

      const target =
        label === 'admin'
          ? '/admin'
          : getValidRedirect(null, user.roles, nextWorkspace);
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
        <p className="auth-subtitle">Sign in to find work or post a job from the same account</p>

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

        <GoogleContinueButton
          onCredential={handleGoogle}
          onUnconfigured={() =>
            setError(
              'Google sign-in is not configured yet. Add the Web client ID to VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID, then restart.',
            )
          }
          disabled={submitting}
        />

        <div className="auth-footer-prompt">
          <span>Don't have an account yet?</span>
          <Link to="/register" className="auth-link">
            Create account
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
                {activeDemo === 'employer' ? 'Signing in…' : 'Employer Demo ⚡'}
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
