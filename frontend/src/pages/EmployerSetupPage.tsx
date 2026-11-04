import { BusinessLicenceUpload } from '../components/BusinessLicenceUpload';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { destinationAfterHire } from '../auth/workspace';
import { ApiError } from '../api/client';
import { filesApi, publicFileUrl } from '../api/files';
import { employerApi } from '../api/employer';
import { ProgressLogo } from '../components/ProgressLogo';
import { COMPANY_SIZE_OPTIONS } from '../constants/companySize';

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

  const [businessLicenceFileId, setBusinessLicenceFileId] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [contactPerson, setContactPerson] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : '',
  );
  const [description, setDescription] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [logoFileId, setLogoFileId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
    if (!logoFileId) {
      setError('Upload a company logo before continuing to job posting.');
      return;
    }

    if (!businessLicenceFileId) { setError('Upload your business licence before continuing.'); return; }
    setSubmitting(true);
    try {
      const result = await enableEmployer({
        name: name.trim(),
        phone: cleanPhone,
        logoFileId,
        businessLicenceFileId,
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(contactPerson.trim() ? { contactPerson: contactPerson.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(companySize ? { companySize } : {}),
      });
      setWorkspace('employer');
      navigate(`/company/${result.company.id}/jobs`, { replace: true });
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
    <div className="auth-page-container employer-onboarding">
      <div className="auth-card auth-card-wide">
        <div className="auth-card-brand">
          <ProgressLogo size="md" />
        </div>

        <h1 className="auth-title">Switch this account to hiring</h1>
        <p className="auth-subtitle">
          {'Keep your existing login. Submit your business licence for admin review. Job posting becomes available after your company is approved.'}
        </p>

        {error && <div className="alert-box-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="profile-upload-card">
              <div className="profile-upload-card-content">
                <div className="profile-logo-frame">
                  {logoFileId ? (
                    <img
                      src={publicFileUrl(logoFileId)}
                      alt="Company logo preview"
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        gap: '2px',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>No logo</span>
                    </div>
                  )}
                </div>
                <div className="profile-upload-meta">
                  <div className="profile-upload-label">
                    <span>Company logo</span>
                    <span className="profile-field-req" title="Required">*</span>
                  </div>
                  <p className="profile-upload-hint">
                    PNG or JPEG · Max 5 MB. Displayed on public vacancies and search results.
                  </p>
                  {logoFileId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className="profile-pill-success">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Logo uploaded
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  id="employer-logo"
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={uploadingLogo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setError(null);
                    setUploadingLogo(true);
                    try {
                      const uploaded = await filesApi.uploadLogo(file);
                      setLogoFileId(uploaded.id);
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setUploadingLogo(false);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="employer-logo"
                  className={`profile-upload-btn ${uploadingLogo ? 'is-disabled' : ''}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {uploadingLogo ? 'Uploading logo…' : logoFileId ? 'Change logo' : 'Upload company logo'}
                </label>
                {uploadingLogo && <span className="muted" style={{ fontSize: '0.82rem' }}>Processing…</span>}
              </div>
            </div>

            <BusinessLicenceUpload value={businessLicenceFileId} onChange={setBusinessLicenceFileId} />
          </div>

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
            <label htmlFor="employer-size">Company size</label>
            <select
              id="employer-size"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
            >
              <option value="">— Optional —</option>
              {COMPANY_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            {submitting ? 'Saving…' : 'Submit company for review'}
          </button>
        </form>
      </div>
    </div>
  );
};
