import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { CompanyPayload } from '../api/admin';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { CompanyLogoMark } from '../components/CompanyLogoMark';
import {
  companyFromRecord,
  emptyCompanyForm,
  sanitizeCompanyPayload,
} from '../components/admin/adminFormUtils';
import { formatCompanySize } from '../constants/companySize';
import { employerJobsPath, employerProfileEditPath, employerProfilePath } from '../auth/workspace';

const saveNoteStyle: React.CSSProperties = {
  margin: '0.85rem 0 0',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1px solid #86efac',
  backgroundColor: '#f0fdf4',
  color: '#15803d',
  fontWeight: 600,
};

export const CompanyProfilePage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = searchParams.get('edit') === '1';
  const [form, setForm] = useState<CompanyPayload>(emptyCompanyForm());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    if (companyQuery.data) {
      setForm(companyFromRecord(companyQuery.data));
    }
  }, [companyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      if (!form.logoFileId) {
        throw new Error('Upload a company logo before saving.');
      }
      const payload = sanitizeCompanyPayload(form);
      return employerApi.updateCompany(companyId, {
        name: payload.name,
        industryId: payload.industryId,
        description: payload.description,
        vision: payload.vision,
        mission: payload.mission,
        websiteUrl: payload.websiteUrl,
        email: payload.email,
        phone: payload.phone,
        country: payload.country,
        region: payload.region,
        city: payload.city,
        address: payload.address,
        companySize: payload.companySize,
        foundedYear: payload.foundedYear,
        logoFileId: payload.logoFileId,
      });
    },
    onSuccess: async () => {
      setError(null);
      setMessage('Company profile saved.');
      await queryClient.invalidateQueries({ queryKey: ['company', 'detail', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['company', 'memberships'] });
      if (companyId) {
        window.setTimeout(() => navigate(employerProfilePath(companyId)), 1200);
      }
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(err.message);
    },
  });

  if (companyQuery.isLoading) {
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '320px' }} />
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <div className="jobs-list-container">
        <div className="alert-box-error">
          <h2>Could not load company profile</h2>
          <p>{(companyQuery.error as Error)?.message || 'Unable to load this company.'}</p>
        </div>
      </div>
    );
  }

  const company = companyQuery.data;
  const logoId = company.logo?.id ?? company.logoFileId ?? null;
  const companySizeLabel = formatCompanySize(company.companySize);
  const locationLine = [company.city, company.region, company.country].filter(Boolean).join(', ');

  if (!isEditing) {
    return (
      <div className="jobs-list-container">
        <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <span className="section-eyebrow">Employer Portal</span>
          <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
            {company.name}
          </h1>
          <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
            Public company profile candidates see on Progress.
          </p>
        </div>

        <header className="jd-header-hero" style={{ marginBottom: '1.5rem' }}>
          <div className="jd-header-top">
            <div className="jd-company-avatar">
              <CompanyLogoMark
                name={company.name}
                logoId={logoId}
                className="jd-company-monogram"
                imgClassName="jd-company-logo-img"
              />
            </div>
            <div className="jd-header-info">
              <h2 className="jd-title" style={{ marginBottom: '0.5rem' }}>
                {company.name}
              </h2>
              <div className="jd-meta-line">
                {company.industry?.name && (
                  <span className="tag-pill tag-category">{company.industry.name}</span>
                )}
                {locationLine && <span className="tag-pill tag-location">{locationLine}</span>}
                {companySizeLabel && <span className="tag-pill">{companySizeLabel}</span>}
                {company.foundedYear && <span className="tag-pill">Founded {company.foundedYear}</span>}
                {company.email && <span className="tag-pill">{company.email}</span>}
                {company.phone && <span className="tag-pill">{company.phone}</span>}
                {company.address && <span className="tag-pill">{company.address}</span>}
              </div>
            </div>
          </div>
          <div className="jd-header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {companyId && (
              <Link to={employerProfileEditPath(companyId)} className="btn-nav-register">
                Edit profile
              </Link>
            )}
            {company.websiteUrl && (
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Visit website
              </a>
            )}
          </div>
        </header>

        {company.description && (
          <section className="jd-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="jd-heading">About</h2>
            <p className="jd-plain-text" style={{ whiteSpace: 'pre-line' }}>
              {company.description}
            </p>
          </section>
        )}
        {company.vision && (
          <section className="jd-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="jd-heading">Vision</h2>
            <p className="jd-plain-text" style={{ whiteSpace: 'pre-line' }}>
              {company.vision}
            </p>
          </section>
        )}
        {company.mission && (
          <section className="jd-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="jd-heading">Mission</h2>
            <p className="jd-plain-text" style={{ whiteSpace: 'pre-line' }}>
              {company.mission}
            </p>
          </section>
        )}

        {companyId && (
          <Link to={employerJobsPath(companyId)} className="btn-clear-filters" style={{ textDecoration: 'none' }}>
            Back to job postings
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="jobs-list-container">
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <span className="section-eyebrow">Employer Portal</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
          {company.name} — Edit profile
        </h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          Update the logo, contact details, and public profile information candidates see.
        </p>
      </div>

      <div
        className="jobs-filter-card"
        style={{
          border: '2px solid rgba(11, 87, 208, 0.25)',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setMessage(null);
            if (!form.logoFileId) {
              setError('Upload a company logo before saving.');
              return;
            }
            saveMutation.mutate();
          }}
        >
          <CompanyFormFields
            value={form}
            onChange={setForm}
            idPrefix="emp-profile"
            audience="employer"
          />

          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={saveMutation.isPending || Boolean(message)}
                style={{ width: 'auto', padding: '0.85rem 2.25rem', cursor: 'pointer' }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save profile →'}
              </button>
              <Link
                to={companyId ? employerProfilePath(companyId) : '/company'}
                className="btn-clear-filters"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Cancel
              </Link>
            </div>
            {message && <p style={saveNoteStyle}>✓ {message}</p>}
            {error && (
              <p className="alert-box-error" style={{ marginTop: '0.85rem' }}>
                {error}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
