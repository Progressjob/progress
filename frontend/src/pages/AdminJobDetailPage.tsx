import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { CreateAdminJobPayload } from '../api/admin';
import { AdminJobFormFields } from '../components/admin/AdminJobFormFields';
import { AdminJobStatusActions } from '../components/admin/AdminJobStatusActions';
import { jobFromRecord, sanitizeJobPayload } from '../components/admin/adminFormUtils';
import {
  actorName,
  formatJobDeadline,
  formatJobStatus,
  formatSalaryForAdmin,
  prettyJobEnum,
} from '../components/admin/adminJobUi';
import { JobProse } from '../components/JobProse';

export const AdminJobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const editing = searchParams.get('edit') === '1';

  const [jobForm, setJobForm] = useState<CreateAdminJobPayload | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ['admin', 'jobs', jobId],
    queryFn: () => adminApi.getJob(jobId!),
    enabled: Boolean(jobId),
  });

  const job = jobQuery.data;

  useEffect(() => {
    if (job) {
      setJobForm(jobFromRecord(job, job.companyId));
    }
  }, [job]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !jobForm) throw new Error('Job is not loaded');
      const sanitized = sanitizeJobPayload(jobForm);
      return adminApi.updateJob(jobId, { ...sanitized, companyId: undefined });
    },
    onSuccess: () => {
      setActionError(null);
      invalidate();
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => adminApi.closeJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => adminApi.archiveJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const busy =
    publishMutation.isPending ||
    closeMutation.isPending ||
    rejectMutation.isPending ||
    archiveMutation.isPending;

  if (jobQuery.isLoading) {
    return (
      <div className="admin-jobs-page">
        <div className="card">Loading job…</div>
      </div>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <div className="stack admin-jobs-page">
        <Link to="/admin/jobs" className="admin-jobs-back">
          ← Jobs
        </Link>
        <div className="alert-box-error">
          {(jobQuery.error as Error)?.message ?? 'Job not found'}
        </div>
      </div>
    );
  }

  const revisions = job.revisions ?? [];
  const canEdit = job.status !== 'archived';

  return (
    <div className="stack admin-jobs-page">
      <Link to="/admin/jobs" className="admin-jobs-back">
        ← Jobs
      </Link>

      {actionError && <div className="alert-box-error">{actionError}</div>}

      <div className="card admin-job-standing">
        <div className="admin-job-standing-top">
          <div>
            <p className="muted" style={{ margin: 0 }}>
              {job.company?.name ?? 'Employer'}
              {job.category?.name ? ` · ${job.category.name}` : ''}
            </p>
            <h1 className="admin-job-title">{job.title}</h1>
            <div className="admin-job-facts">
              <span className={`admin-status-pill is-${job.status}`}>{formatJobStatus(job.status)}</span>
              {job.employerEdited && <span className="admin-status-pill is-edited">Employer edited</span>}
              {job.location?.name && <span>{job.location.name}</span>}
              <span>{prettyJobEnum(job.employmentType)}</span>
              <span>{prettyJobEnum(job.workplaceType)}</span>
              <span>{formatSalaryForAdmin(job)}</span>
              <span>Deadline {formatJobDeadline(job.applicationDeadline)}</span>
              <span>
                {job.vacanciesCount} {job.vacanciesCount === 1 ? 'vacancy' : 'vacancies'}
              </span>
            </div>
          </div>
          <div className="admin-jobs-actions">
            {canEdit && !editing && (
              <Link to={`/admin/jobs/${job.id}?edit=1`} className="admin-jobs-action is-primary">
                Edit
              </Link>
            )}
            {editing && (
              <button
                type="button"
                className="admin-jobs-action"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('edit');
                  setSearchParams(next);
                }}
              >
                Cancel edit
              </button>
            )}
            <AdminJobStatusActions
              job={job}
              busy={busy}
              onPublish={(id) => publishMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
              onClose={(id) => closeMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
            {job.status === 'published' && (
              <Link to={`/jobs/${job.slug}`} className="admin-jobs-action">
                Public preview
              </Link>
            )}
          </div>
        </div>

        {job.summary && (
          <section className="admin-job-section">
            <h2>Summary</h2>
            <JobProse text={job.summary} />
          </section>
        )}
        {(job.responsibilities || job.description) && (
          <section className="admin-job-section">
            <h2>Responsibilities</h2>
            <JobProse text={job.responsibilities || job.description} preferList />
          </section>
        )}
        {job.requirements && (
          <section className="admin-job-section">
            <h2>Requirements</h2>
            <JobProse text={job.requirements} preferList />
          </section>
        )}
        {job.educationRequirement && (
          <section className="admin-job-section">
            <h2>Education</h2>
            <p>{job.educationRequirement}</p>
          </section>
        )}
      </div>

      <div className="card">
        <h2 className="admin-jobs-card-title">Changes</h2>
        {revisions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No edits recorded yet. Field changes from this point on appear here.
          </p>
        ) : (
          <div className="admin-change-list">
            {revisions.map((revision) => (
              <article key={revision.id} className="admin-change-entry">
                <header className="admin-change-meta">
                  <strong>{actorName(revision.actor)}</strong>
                  <span className={`admin-status-pill is-${revision.source}`}>
                    {revision.source === 'employer' ? 'Employer' : 'Admin'}
                  </span>
                  <time className="muted" dateTime={revision.createdAt}>
                    {new Date(revision.createdAt).toLocaleString()}
                  </time>
                </header>
                <ul className="admin-change-fields">
                  {revision.changes.map((change) => (
                    <li key={`${revision.id}-${change.field}`}>
                      <span className="admin-change-label">{change.label}</span>
                      <div className="admin-change-pair">
                        <div className="admin-change-from">{change.from || '—'}</div>
                        <div className="admin-change-to">{change.to || '—'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>

      {editing && canEdit && jobForm && (
        <div className="card">
          <h2 className="admin-jobs-card-title">Edit posting</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActionError(null);
              updateMutation.mutate();
            }}
          >
            <AdminJobFormFields
              value={jobForm}
              onChange={setJobForm}
              hideCompanySelect
            />
            <div className="admin-jobs-form-actions">
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={updateMutation.isPending}
                style={{ width: 'auto', padding: '0.85rem 2rem' }}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
