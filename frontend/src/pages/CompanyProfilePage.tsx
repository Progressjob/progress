import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { CompanyPayload } from '../api/admin';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { CompanyOverview } from '../components/CompanyOverview';
import {
  companyFromRecord,
  emptyCompanyForm,
  sanitizeCompanyPayload,
} from '../components/admin/adminFormUtils';
import { employerProfileEditPath, employerProfilePath } from '../auth/workspace';

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
  const publishedJobs = (jobsQuery.data ?? []).filter((job) => job.status === 'published');

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
            licenceRequired={false}
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
