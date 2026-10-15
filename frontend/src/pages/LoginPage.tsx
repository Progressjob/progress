import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ProgressLogo } from '../components/ProgressLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      if (from) {
        navigate(from, { replace: true });
      } else if (user.roles.includes('admin') || user.roles.includes('moderator')) {
        navigate('/admin', { replace: true });
      } else if (user.roles.includes('employer')) {
        navigate('/employer', { replace: true });
      } else {
        navigate('/jobs', { replace: true });
      }
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

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setIdentifier(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-card-brand">
          <ProgressLogo size="md" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to access your jobs, applications, or employer portal</p>

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
                onClick={() => fillDemo('candidate@example.com', 'Candidate123!')}
              >
                Candidate Demo
              </button>
              <button
                type="button"
                className="dev-chip"
                onClick={() => fillDemo('employer@example.com', 'Employer123!')}
              >
                Employer Demo
              </button>
              <button
                type="button"
                className="dev-chip"
                onClick={() => fillDemo('admin@example.com', 'ChangeMe123!')}
              >
                Admin Demo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
