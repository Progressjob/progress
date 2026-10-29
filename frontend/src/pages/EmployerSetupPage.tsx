import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { destinationAfterHire } from '../auth/workspace';
import { ApiError } from '../api/client';
import { employerApi } from '../api/employer';
import { ProgressLogo } from '../components/ProgressLogo';

export const EmployerSetupPage: React.FC = () => {
  const { user, loading: authLoading, enableEmployer, setWorkspace } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
    enabled: Boolean(user),
  });

  const existingCompanyId =
    user?.companyMemberships?.[0]?.companyId || companiesQuery.data?.[0]?.id;

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [contactPerson, setContactPerson] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : '',
  );
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone, phone]);

  useEffect(() => {
    if (existingCompanyId) {
      setWorkspace('employer');
      navigate(destinationAfterHire(existingCompanyId, next), { replace: true });
    }
  }, [existingCompanyId, navigate, next, setWorkspace]);

  if (authLoading || (Boolean(user) && companiesQuery.isLoading)) {
    return (
      <div className="card" style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        Checking employer credentials...
      </div>
    );
  }

  if (existingCompanyId) {
    return (
      <div className="card" style={{ maxWidth: '480px', margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        Opening your job dashboard...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('A valid phone number (at least 9 digits) is strictly required.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await enableEmployer({
        name: name.trim(),
        phone: cleanPhone,
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(contactPerson.trim() ? { contactPerson: contactPerson.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setWorkspace('employer');
      navigate(destinationAfterHire(result.company.id, next), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Could not create your employer profile.');
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

        <h1 className="auth-title">Switch this account to hiring</h1>
        <p className="auth-subtitle">
          {next?.startsWith('/cv-search/')
            ? 'You keep the same login. After this short hiring setup, we’ll open the CV you selected.'
            : 'You keep the same login. After this, use Switch to hiring in the nav to post jobs, and Switch to finding work to go back to searching.'}
        </p>

        {error && <div className="alert-box-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-input-group">
            <label htmlFor="employer-name">Hiring as *</label>
            <input
              id="employer-name"
              type="text"
              required
              minLength={2}
              placeholder="Your name or business"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-row-two">
            <div className="form-input-group">
              <label htmlFor="employer-city">City</label>
              <input
                id="employer-city"
                type="text"
                placeholder="Adama"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-input-group">
              <label htmlFor="employer-phone">Phone *</label>
              <input
                id="employer-phone"
                type="tel"
                required
                minLength={9}
                placeholder="+251 9... (Strictly required)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-input-group">
              <label htmlFor="employer-email">Contact email</label>
              <input
                id="employer-email"
                type="email"
                placeholder="hiring@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-input-group">
              <label htmlFor="employer-contact">Contact person</label>
              <input
                id="employer-contact"
                type="text"
                placeholder="Who should applicants reach"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </div>

          <div className="form-input-group">
            <label htmlFor="employer-description">About the employer</label>
            <textarea
              id="employer-description"
              rows={4}
              placeholder="A short note candidates will see on your posts"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-auth-submit" disabled={submitting}>
            {submitting ? 'Saving…' : next?.startsWith('/cv-search/') ? 'Continue to CV →' : 'Continue to job post →'}
          </button>
        </form>
      </div>
    </div>
  );
};
