import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
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
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [deadlineNote, setDeadlineNote] = useState('');

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

  const lockCategory =
    isEdit &&
    Boolean(
      jobQuery.data &&
        (jobQuery.data.status === 'pending_review' ||
          jobQuery.data.status === 'published' ||
          jobQuery.data.status === 'closed'),
    );

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
        const { applicationDeadline: _d, ...content } = payload;
        return employerApi.updateJob(companyId, jobId, lockCategory ? { ...content, categoryId: undefined } : content);
      }
      const job = await employerApi.createJob(companyId, payload);
      return employerApi.submitJob(companyId, job.id);
    },
    onSuccess: (job) => {
      setError(null);
      if (isEdit) {
        setMessage('Job posting updated.');
        return;
      }
      if (job.status === 'published') {
        setMessage('Your job is live on the public board.');
      } else {
        setMessage('Your job was submitted and is under admin review.');
      }
      setTimeout(() => navigate(`/company/${companyId}/jobs`), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deadlineMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !jobId) throw new Error('Job is required');
      if (!requestedDeadline) throw new Error('Choose a new deadline date.');
      return employerApi.requestDeadlineChange(companyId, jobId, {
        requestedDeadline,
        note: deadlineNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      setError(null);
      setMessage('Deadline change sent to admin for review.');
      setDeadlineNote('');
      void jobQuery.refetch();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    saveMutation.mutate();
  };

  const company = companyQuery.data;
  const existing = jobQuery.data;
  const pendingDeadline = existing?.requestedDeadline?.slice(0, 10);

  return (
    <div className="jobs-list-container">
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <nav className="detail-breadcrumbs" style={{ marginBottom: '1rem' }}>
          <Link to={`/company/${companyId}/jobs`}>Job postings</Link>
        </nav>
        <span className="section-eyebrow">Employer</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
          {isEdit ? 'Edit job posting' : 'Post job opportunity'}
        </h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          {company?.name ?? 'Company'} —{' '}
          {isEdit
            ? 'Update the listing details. Deadline changes need admin approval so a vacancy cannot be reused as a different post.'
            : company?.canSelfPublishJobs
              ? 'Your organization has direct posting permissions. Posts go live immediately.'
              : 'New job postings are submitted for administrator review before going live on the public board.'}
        </p>
      </div>

      {message && (
        <div
          className="card"
          style={{
            borderColor: '#16a34a',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          ✓ {message}
        </div>
      )}

      {error && <div className="alert-box-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

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
              lockDeadline={isEdit}
              lockCategory={lockCategory}
            />

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={saveMutation.isPending}
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
          </form>

          {isEdit && existing && ['published', 'pending_review'].includes(existing.status) && (
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem' }}>Request deadline change</h3>
              <p className="muted" style={{ margin: '0 0 1rem' }}>
                Admins review this so one vacancy cannot be extended or reused as a different role.
              </p>
              {pendingDeadline && (
                <p style={{ margin: '0 0 1rem', fontWeight: 600, color: '#b45309' }}>
                  Pending request: {new Date(pendingDeadline).toLocaleDateString()}
                  {existing.deadlineChangeNote ? ` — ${existing.deadlineChangeNote}` : ''}
                </p>
              )}
              <div className="form-row-two">
                <div className="form-input-group">
                  <label htmlFor="req-deadline">New deadline</label>
                  <input
                    id="req-deadline"
                    type="date"
                    value={requestedDeadline}
                    onChange={(e) => setRequestedDeadline(e.target.value)}
                  />
                </div>
                <div className="form-input-group">
                  <label htmlFor="req-deadline-note">Note for admin</label>
                  <input
                    id="req-deadline-note"
                    value={deadlineNote}
                    onChange={(e) => setDeadlineNote(e.target.value)}
                    placeholder="Why this date needs to change"
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn-card-apply"
                style={{ marginTop: '0.75rem', cursor: 'pointer', border: 'none' }}
                disabled={deadlineMutation.isPending}
                onClick={() => {
                  setMessage(null);
                  setError(null);
                  deadlineMutation.mutate();
                }}
              >
                {deadlineMutation.isPending ? 'Sending…' : 'Send request to admin'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
