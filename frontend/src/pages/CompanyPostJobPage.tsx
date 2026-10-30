import { BackButton } from '../components/BackButton';
import { CompanyVerificationNotice } from '../components/CompanyVerificationNotice';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { filesApi, publicFileUrl } from '../api/files';
import { AdminJobFormFields } from '../components/admin/AdminJobFormFields';
import {
  emptyAdminJobForm,
  jobFromRecord,
  sanitizeJobPayload,
} from '../components/admin/adminFormUtils';
import type { CreateAdminJobPayload } from '../api/admin';

export const CompanyPostJobPage: React.FC = () => {
  const { companyId, jobId } = useParams<{ companyId: string; jobId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(jobId);

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobQuery = useQuery({
    queryKey: ['company', 'job', companyId, jobId],
    queryFn: () => employerApi.getJob(companyId!, jobId!),
    enabled: Boolean(companyId && jobId),
  });

  const [jobForm, setJobForm] = useState<CreateAdminJobPayload>(() =>
    emptyAdminJobForm(companyId ?? ''),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (companyId && !isEdit) {
      setJobForm((prev) => ({ ...prev, companyId }));
    }
  }, [companyId, isEdit]);

  useEffect(() => {
    if (companyId && jobQuery.data) {
      setJobForm(jobFromRecord(jobQuery.data, companyId));
    }
  }, [companyId, jobQuery.data]);

  const toPayload = (sanitized: CreateAdminJobPayload) => ({
    categoryId: sanitized.categoryId,
    locationId: sanitized.locationId,
    title: sanitized.title,
    description: sanitized.description || sanitized.responsibilities || sanitized.title,
    responsibilities: sanitized.responsibilities,
    requirements: sanitized.requirements,
    educationRequirement: sanitized.educationRequirement,
    experienceMinYears: sanitized.experienceMinYears,
    employmentType: sanitized.employmentType,
    workplaceType: sanitized.workplaceType,
    salaryMin: sanitized.salaryMin,
    salaryMax: sanitized.salaryMax,
    salaryCurrency: sanitized.salaryCurrency,
    salaryVisibility: sanitized.salaryVisibility,
    applicationDeadline: sanitized.applicationDeadline,
    vacanciesCount: sanitized.vacanciesCount,
    applicationMethod: sanitized.applicationMethod ?? 'admin' as const,
    applicationEmail: sanitized.applicationEmail,
    applicationInstructions: sanitized.applicationInstructions,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const sanitized = sanitizeJobPayload({ ...jobForm, companyId });
      const payload = toPayload(sanitized);
      if (isEdit && jobId) {
        return employerApi.updateJob(companyId, jobId, payload);
      }
      const job = await employerApi.createJob(companyId, payload);
      return employerApi.submitJob(companyId, job.id);
    },
    onSuccess: (job) => {
      setError(null);
      if (isEdit) {
        setMessage('Job posting updated.');
      } else if (job.status === 'published') {
        setMessage('Your job is live on the public board.');
      } else {
        setMessage('Sent for review. An administrator has to post it before it appears on the public board.');
      }
      void queryClient.invalidateQueries({ queryKey: ['company', 'jobs', companyId] });
      window.setTimeout(() => navigate(`/company/${companyId}/jobs`), 1200);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!companyQuery.data?.logo?.id && !companyQuery.data?.logoFileId) {
      setError('Upload a company logo before posting. That logo is used on every vacancy.');
      return;
    }
    saveMutation.mutate();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !companyId) return;
    setError(null);
    setUploadingLogo(true);
    try {
      const uploaded = await filesApi.uploadLogo(file);
      await employerApi.updateCompany(companyId, { logoFileId: uploaded.id });
      await queryClient.invalidateQueries({ queryKey: ['company', 'detail', companyId] });
      setMessage('Logo saved. New and existing job posts will use this logo.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const company = companyQuery.data;
  const logoId = company?.logo?.id ?? company?.logoFileId ?? null;
  const needsLogo = Boolean(company) && !logoId;

  if (company && company.verificationStatus !== 'verified') return <div className="jobs-list-container"><BackButton fallback={`/company/${companyId}/jobs`} /><CompanyVerificationNotice company={company} /></div>;

  return (
    <div className="jobs-list-container">
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <BackButton fallback={`/company/${companyId}/jobs`} />
        <span className="section-eyebrow">Employer</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
          {isEdit ? 'Edit job posting' : 'Post job opportunity'}
        </h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          {company?.name ?? 'Company'} —{' '}
          {isEdit
            ? 'Update any listing details, including the deadline and role area, then save.'
            : company?.canSelfPublishJobs && company.verificationStatus === 'verified'
              ? 'Your organization has direct posting permissions. Posts go live immediately.'
              : 'This posting is sent to an administrator. It stays off the public board until they review and post it.'}
        </p>
      </div>

      {needsLogo && (
        <div className="jobs-filter-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Company logo required</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Add one logo for {company?.name ?? 'this employer'}. Every job posting uses this same logo.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={uploadingLogo}
            onChange={handleLogoUpload}
          />
          {uploadingLogo && <span className="muted"> Uploading…</span>}
        </div>
      )}

      {logoId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <img
            src={publicFileUrl(logoId)}
            alt={company?.name ?? 'Company logo'}
            style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <span className="muted">This logo appears on all job posts for this employer.</span>
        </div>
      )}

      {isEdit && jobQuery.isLoading && <div className="card">Loading job...</div>}

      {(!isEdit || jobQuery.data) && (
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
          <form onSubmit={handleSubmit}>
            <AdminJobFormFields
              value={jobForm}
              onChange={setJobForm}
              hideCompanySelect={true}
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
                  disabled={saveMutation.isPending || needsLogo || Boolean(message)}
                  style={{ width: 'auto', padding: '0.85rem 2.25rem', cursor: 'pointer' }}
                >
                  {saveMutation.isPending
                    ? isEdit
                      ? 'Saving…'
                      : 'Submitting…'
                    : isEdit
                      ? 'Save changes →'
                      : 'Submit job posting →'}
                </button>
                <Link
                  to={`/company/${companyId}/jobs`}
                  className="btn-clear-filters"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Cancel
                </Link>
              </div>
              {message && (
                <p
                  style={{
                    margin: '0.85rem 0 0',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #86efac',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    fontWeight: 600,
                  }}
                >
                  ✓ {message}
                </p>
              )}
              {error && (
                <p className="alert-box-error" style={{ marginTop: '0.85rem' }}>
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
