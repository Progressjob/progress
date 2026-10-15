import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        phone: phone.trim() || undefined,
        password,
      });
      navigate('/candidate/profile', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="narrow-container">
      <div className="page-header">
        <h1>Candidate Registration</h1>
        <p className="muted">
          Create a candidate account (employer accounts are created by an administrator).
        </p>
      </div>

      <div className="card">
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="grid-two">
            <div className="field">
              <label htmlFor="reg-first">First Name *</label>
              <input
                id="reg-first"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="reg-last">Last Name *</label>
              <input
                id="reg-last"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="reg-email">Email *</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-phone">Phone (Optional)</label>
            <input
              id="reg-phone"
              type="text"
              placeholder="+251911000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-pass">Password (min 8 chars) *</label>
            <input
              id="reg-pass"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register Candidate Account'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
