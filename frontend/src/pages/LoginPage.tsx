import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setError((err as Error).message || 'Login failed');
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
    <div className="narrow-container">
      <div className="page-header">
        <h1>Sign In</h1>
        <p className="muted">Enter your email or phone number and password.</p>
      </div>

      <div className="card dev-seed-banner">
        <strong>Quick Fill — Development Seed Accounts (§13):</strong>
        <div className="seed-buttons">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => fillDemo('candidate@example.com', 'Candidate123!')}
          >
            Candidate (candidate@example.com)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => fillDemo('employer@example.com', 'Employer123!')}
          >
            Employer (employer@example.com)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => fillDemo('admin@example.com', 'ChangeMe123!')}
          >
            Admin (admin@example.com)
          </button>
        </div>
      </div>

      <div className="card">
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="login-id">Email or Phone *</label>
            <input
              id="login-id"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="login-pass">Password *</label>
            <input
              id="login-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Need a candidate account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};
