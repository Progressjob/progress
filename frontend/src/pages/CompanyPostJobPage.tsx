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
    applicationMethod: sanitized.applicationMethod ?? ('admin' as const),
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
        setMessage(
          'Sent for review. An administrator has to post it before it appears on the public board.',
        );
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

  if (company && company.verificationStatus !== 'verified') {
    return (
      <div className="profile-edit-page">
        <div className="profile-edit-nav">
          <BackButton fallback={`/company/${companyId}/jobs`} />
        </div>
        <CompanyVerificationNotice company={company} />
      </div>
    );
  }

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-nav">
        <BackButton fallback={`/company/${companyId}/jobs`} />
        <Link
          to={`/company/${companyId}/jobs`}
          className="profile-btn-cancel"
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
        >
          Cancel and return to jobs ↗
        </Link>
      </div>

      <div className="profile-edit-hero">
        <div className="profile-edit-hero-main">
          <div className="profile-edit-hero-avatar">
            {logoId ? (
              <img src={publicFileUrl(logoId)} alt={company?.name ?? 'Company logo'} />
            ) : (
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b57d0' }}>
                {company?.name?.charAt(0).toUpperCase() || 'C'}
              </span>
            )}
          </div>
          <div className="profile-edit-hero-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="profile-edit-badge">
                {isEdit ? 'Edit Vacancy' : 'New Job Opportunity'}
              </span>
              {company?.verificationStatus === 'verified' && (
                <span
                  className="profile-pill-success"
                  style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                >
                  ✓ Verified Employer
                </span>
              )}
            </div>
            <h1 className="profile-edit-hero-title">
              {isEdit ? 'Edit Job Posting' : 'Post Job Opportunity'}
            </h1>
            <p className="profile-edit-hero-desc">
              {company?.name ? `${company.name} • ` : ''}
              {isEdit
                ? 'Update listing specifications, role duties, compensation, or deadline.'
                : company?.canSelfPublishJobs && company.verificationStatus === 'verified'
                  ? 'Your organization has direct publishing privileges. Vacancies appear immediately.'
                  : 'Submitted postings are verified by an administrator before appearing on the public board.'}
            </p>
          </div>
        </div>
      </div>

      {needsLogo && (
        <div className="profile-upload-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-upload-card-content">
            <div className="profile-doc-icon-frame">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="profile-upload-meta">
              <div className="profile-upload-label">
                <span>Company logo required</span>
                <span className="profile-field-req">*</span>
              </div>
              <p className="profile-upload-hint">
                Please upload a company logo before posting. It will be displayed on all vacancy listings
                for {company?.name ?? 'your organization'}.
              </p>
            </div>
          </div>
          <div>
            <label className={`profile-upload-btn ${uploadingLogo ? 'is-disabled' : ''}`}>
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploadingLogo}
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              {uploadingLogo ? 'Uploading logo…' : 'Upload Company Logo'}
            </label>
          </div>
        </div>
      )}

      {isEdit && jobQuery.isLoading && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          Loading vacancy details...
        </div>
      )}

      {(!isEdit || jobQuery.data) && (
        <div className="profile-edit-card">
          <form onSubmit={handleSubmit}>
            <AdminJobFormFields
              value={jobForm}
              onChange={setJobForm}
              hideCompanySelect={true}
              idPrefix="emp-job"
            />

            <div className="profile-edit-footer">
              <div className="profile-edit-footer-btns">
                <button
                  type="submit"
                  className="profile-btn-save"
                  disabled={saveMutation.isPending || needsLogo || Boolean(message)}
                >
                  {saveMutation.isPending
                    ? isEdit
                      ? 'Saving changes…'
                      : 'Submitting vacancy…'
                    : isEdit
                      ? 'Save changes →'
                      : 'Submit job posting →'}
                </button>
                <Link to={`/company/${companyId}/jobs`} className="profile-btn-cancel">
                  Cancel
                </Link>
              </div>

              {message && (
                <div
                  className="profile-pill-success"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.88rem' }}
                >
                  ✓ {message}
                </div>
              )}

              {error && (
                <div className="alert-box-error" style={{ margin: 0, padding: '0.6rem 1rem' }}>
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
