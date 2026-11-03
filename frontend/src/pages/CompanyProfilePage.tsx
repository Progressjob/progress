import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { CompanyPayload } from '../api/admin';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { CompanyOverview } from '../components/CompanyOverview';
import { BackButton } from '../components/BackButton';
import { publicFileUrl } from '../api/files';
import {
  companyFromRecord,
  emptyCompanyForm,
  sanitizeCompanyPayload,
} from '../components/admin/adminFormUtils';
import { employerProfileEditPath, employerProfilePath } from '../auth/workspace';

const saveNoteStyle: React.CSSProperties = {
  margin: '1rem 0 0',
  padding: '0.85rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid #86efac',
  backgroundColor: '#f0fdf4',
  color: '#15803d',
  fontWeight: 650,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
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

  const jobsQuery = useQuery({
    queryKey: ['company', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId) && !isEditing,
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
        businessLicenceFileId: payload.businessLicenceFileId,
      });
    },
    onSuccess: async () => {
      setError(null);
      setMessage('Company profile saved successfully.');
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
  const publishedJobs = (jobsQuery.data ?? []).filter((job) => job.status === 'published');
  const activeLogoId = form.logoFileId || company.logo?.id || company.logoFileId;

  if (!isEditing) {
    return (
      <div className="jobs-list-container">
        <CompanyOverview
          company={company}
          jobs={publishedJobs}
          editHref={companyId ? employerProfileEditPath(companyId) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-nav">
        <BackButton fallback={companyId ? employerProfilePath(companyId) : '/company'} />
        {companyId && (
          <Link
            to={employerProfilePath(companyId)}
            className="profile-btn-cancel"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            View profile ↗
          </Link>
        )}
      </div>

      <div className="profile-edit-hero">
        <div className="profile-edit-hero-main">
          <div className="profile-edit-hero-avatar">
            {activeLogoId ? (
              <img src={publicFileUrl(activeLogoId)} alt={company.name} />
            ) : (
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b57d0' }}>
                {company.name?.charAt(0).toUpperCase() || 'C'}
              </span>
            )}
          </div>
          <div className="profile-edit-hero-text">
            <span className="profile-edit-badge">Employer Portal</span>
            <h1 className="profile-edit-hero-title">
              {company.name} — Edit profile
            </h1>
            <p className="profile-edit-hero-desc">
              Manage your branding, verification documents, contact channels, and office location.
            </p>
          </div>
        </div>

        {company.verificationStatus === 'verified' && (
          <span className="profile-pill-success" title="Verified employer status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified Employer
          </span>
        )}
      </div>

      <div className="profile-edit-card">
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
            licenceRequired={false}
            value={form}
            onChange={setForm}
            idPrefix="emp-profile"
            audience="employer"
          />

          <div className="profile-edit-footer">
            <div style={{ minWidth: 0 }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Changes will be reflected across candidate vacancy postings and your public profile.
              </span>
            </div>

            <div className="profile-edit-footer-btns">
              <Link
                to={companyId ? employerProfilePath(companyId) : '/company'}
                className="profile-btn-cancel"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="profile-btn-save"
                disabled={saveMutation.isPending || Boolean(message)}
              >
                {saveMutation.isPending ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    Saving changes…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Save profile →
                  </>
                )}
              </button>
            </div>
          </div>

          {message && (
            <div style={{ padding: '0 2.25rem 1.5rem' }}>
              <p style={saveNoteStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {message}
              </p>
            </div>
          )}

          {error && (
            <div style={{ padding: '0 2.25rem 1.5rem' }}>
              <p className="alert-box-error" style={{ margin: 0 }}>
                {error}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
