import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { EthiopianPhoneInput } from '../components/EthiopianPhoneInput';
import { GoogleContinueButton } from '../components/GoogleContinueButton';
import { ProgressLogo } from '../components/ProgressLogo';
import { isValidEthiopianMobile, toEthiopianE164 } from '../utils/ethiopianPhone';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
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
    const cleanPhone = toEthiopianE164(phone);
    if (!cleanPhone || !isValidEthiopianMobile(phone)) {
      setError('Enter a valid Ethiopian mobile number (9 digits starting with 7 or 9).');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        password,
      });
      navigate('/jobs', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Registration failed. Please verify your details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const { isNew } = await loginWithGoogle(idToken);
      navigate(isNew ? '/candidate/profile?edit=1&welcome=1' : '/jobs', { replace: true });
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

  return (
    <div className="auth-page-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-card-brand">
          <ProgressLogo size="md" />
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">
          One account to find work and, when you are ready, post a job. Start with a name, email, and password.
        </p>

        {error && <div className="alert-box-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-two">
            <div className="form-input-group">
              <label htmlFor="reg-first">First Name *</label>
              <input
                id="reg-first"
                type="text"
                required
                placeholder="Abebe"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="reg-last">Last Name *</label>
              <input
                id="reg-last"
                type="text"
                required
                placeholder="Kebede"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-input-group">
            <label htmlFor="reg-email">Email Address *</label>
            <div className="auth-input-wrapper">
              <svg className="auth-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                <polyline points="22,6 12,13 2,6" strokeWidth="2" />
              </svg>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="abebe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-input-group">
            <label htmlFor="reg-phone">Mobile Phone *</label>
            <div className="auth-input-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
              <EthiopianPhoneInput
                id="reg-phone"
                value={phone}
                onChange={setPhone}
                required
              />
            </div>
          </div>

          <div className="form-input-group">
            <label htmlFor="reg-pass">Secure Password (min 8 characters) *</label>
            <div className="auth-input-wrapper">
              <svg className="auth-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
              </svg>
              <input
                id="reg-pass"
                type="password"
                minLength={8}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account & Continue →'}
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
          <span>Already registered with Progress?</span>
          <Link to="/login" className="auth-link">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
