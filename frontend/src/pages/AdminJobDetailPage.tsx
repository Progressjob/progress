import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { CreateAdminJobPayload } from '../api/admin';
import { jobsApi } from '../api/jobs';
import { AdminJobFormFields } from '../components/admin/AdminJobFormFields';
import { AdminJobStatusActions } from '../components/admin/AdminJobStatusActions';
import { jobFromRecord, sanitizeJobPayload } from '../components/admin/adminFormUtils';
import { actorName, formatJobStatus } from '../components/admin/adminJobUi';
import { JobDetailContent } from '../components/jobs/JobDetailContent';

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isDeadlineValid(iso: string, minDay: string): boolean {
  if (!iso) return false;
  return iso >= minDay;
}

export const AdminJobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const editing = searchParams.get('edit') === '1';
  const reopenMode = searchParams.get('reopen') === '1';

  const [jobForm, setJobForm] = useState<CreateAdminJobPayload | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [reopenStep, setReopenStep] = useState<1 | 2>(1);
  const minDeadline = utcTodayIso();

  const jobQuery = useQuery({
    queryKey: ['admin', 'jobs', jobId],
    queryFn: () => adminApi.getJob(jobId!),
    enabled: Boolean(jobId),
  });

  const featuredQuery = useQuery({
    queryKey: ['jobs', 'detail-featured'],
    queryFn: () => jobsApi.list({ page: 1, limit: 6 }),
  });

  const job = jobQuery.data;
  const isReopening = Boolean(reopenMode && job?.status === 'closed');

  useEffect(() => {
    if (job) {
      const next = jobFromRecord(job, job.companyId);
      if (reopenMode && job.status === 'closed') {
        const current = next.applicationDeadline?.slice(0, 10) || '';
        if (!isDeadlineValid(current, minDeadline)) {
          next.applicationDeadline = addDaysIso(30);
        }
      }
      setJobForm(next);
      setReopenStep(1);
    }
  }, [job, reopenMode, minDeadline]);

  useEffect(() => {
    if (!reopenMode || !job) return;
    if (job.status !== 'closed') {
      const next = new URLSearchParams(searchParams);
      next.delete('reopen');
      setSearchParams(next, { replace: true });
      return;
    }
    if (!editing) {
      const next = new URLSearchParams(searchParams);
      next.set('edit', '1');
      next.set('reopen', '1');
      setSearchParams(next, { replace: true });
    }
  }, [reopenMode, editing, job, searchParams, setSearchParams]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const clearEditParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    next.delete('reopen');
    setSearchParams(next);
  };

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !jobForm) throw new Error('Job is not loaded');
      if (!isDeadlineValid(jobForm.applicationDeadline, minDeadline)) {
        throw new Error('Choose a deadline of today or a future date before reopening.');
      }
      const sanitized = sanitizeJobPayload(jobForm);
      await adminApi.updateJob(jobId, { ...sanitized, companyId: undefined });
      return adminApi.publishJob(jobId);
    },
    onSuccess: (updated) => {
      setActionError(null);
      setActionNotice(`“${updated.title}” is live again with the new deadline.`);
      invalidate();
      navigate('/admin/jobs?view=active');
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !jobForm) throw new Error('Job is not loaded');
      if (isReopening && !isDeadlineValid(jobForm.applicationDeadline, minDeadline)) {
        throw new Error('Choose a deadline of today or a future date before saving.');
      }
      const sanitized = sanitizeJobPayload(jobForm);
      return adminApi.updateJob(jobId, { ...sanitized, companyId: undefined });
    },
    onSuccess: () => {
      setActionError(null);
      invalidate();
      clearEditParams();
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
    archiveMutation.isPending ||
    reopenMutation.isPending ||
    updateMutation.isPending;

  const deadlineOk = useMemo(
    () => Boolean(jobForm && isDeadlineValid(jobForm.applicationDeadline, minDeadline)),
    [jobForm, minDeadline],
  );

  const startReopen = (id: string) => {
    setActionError(null);
    setActionNotice(null);
    setReopenStep(1);
    setSearchParams({ edit: '1', reopen: '1' });
    if (id !== jobId) navigate(`/admin/jobs/${id}?edit=1&reopen=1`);
  };

  if (jobQuery.isLoading) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="job-card-skeleton" style={{ minHeight: '340px' }} />
        </div>
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
  const previewNote =
    job.status === 'published'
      ? 'Admin preview — this is the same layout candidates see.'
      : `Admin preview (${formatJobStatus(job.status)}) — candidates only see published live vacancies.`;

  const goReopenStep2 = () => {
    setActionError(null);
    if (!jobForm || !deadlineOk) {
      setActionError('Choose a deadline of today or a future date to continue.');
      return;
    }
    setReopenStep(2);
  };

  return (
    <div className="admin-job-candidate-view">
      <div className="admin-job-preview-bar">
        <div className="admin-job-preview-bar-main">
          <Link to={isReopening ? '/admin/jobs?view=history' : '/admin/jobs'} className="admin-jobs-back">
            ← Jobs
          </Link>
          <span className={`admin-status-pill is-${job.status}`}>{formatJobStatus(job.status)}</span>
          {job.employerEdited && <span className="admin-status-pill is-edited">Employer edited</span>}
          {isReopening && <span className="admin-status-pill is-edited">Reopening</span>}
        </div>
        <div className="admin-jobs-actions">
          {!editing && (
            <Link
              to={`/admin/companies/${job.companyId}/jobs/${job.id}/applications`}
              className="admin-jobs-action"
            >
              View applications
            </Link>
          )}
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
                clearEditParams();
                setReopenStep(1);
                setActionError(null);
              }}
            >
              Cancel
            </button>
          )}
          {!isReopening && (
            <AdminJobStatusActions
              job={job}
              busy={busy}
              onPublish={(id) => publishMutation.mutate(id)}
              onReopen={startReopen}
              onReject={(id) => rejectMutation.mutate(id)}
              onClose={(id) => closeMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
          )}
          {job.status === 'published' && (
            <Link to={`/jobs/${job.slug}`} className="admin-jobs-action">
              Public URL
            </Link>
          )}
        </div>
      </div>

      {actionError && <div className="alert-box-error admin-job-preview-error">{actionError}</div>}
      {actionNotice && <div className="employer-jobs-banner admin-job-preview-error">{actionNotice}</div>}

      {editing && canEdit && jobForm && isReopening && (
        <div className="admin-reopen-shell">
          <div className="card admin-reopen-panel">
            <ol className="admin-reopen-progress" aria-label="Reopen steps">
              <li className={reopenStep === 1 ? 'is-active' : 'is-done'}>
                <span className="admin-reopen-progress-num">1</span>
                <span className="admin-reopen-progress-copy">
                  <strong>Deadline</strong>
                  <small>Set a future closing date</small>
                </span>
              </li>
              <li className={reopenStep === 2 ? 'is-active' : ''}>
                <span className="admin-reopen-progress-num">2</span>
                <span className="admin-reopen-progress-copy">
                  <strong>Review</strong>
                  <small>Check details, then reopen</small>
                </span>
              </li>
            </ol>

            {reopenStep === 1 ? (
              <section className="admin-reopen-step-panel" aria-labelledby="reopen-step1-title">
                <div className="admin-reopen-step-head">
                  <p className="admin-reopen-kicker">Step 1 of 2</p>
                  <h2 id="reopen-step1-title">Choose a new deadline</h2>
                  <p>
                    “{job.title}” is closed. Pick today or a later date before it can go live again.
                  </p>
                </div>

                <div className="admin-reopen-deadline-box">
                  <div className="admin-reopen-deadline-presets">
                    <span>Quick pick</span>
                    <div className="emp-preset-pills-row">
                      {[14, 30, 60].map((days) => {
                        const value = addDaysIso(days);
                        return (
                          <button
                            key={days}
                            type="button"
                            className={`emp-preset-pill-btn${jobForm.applicationDeadline === value ? ' is-selected' : ''}`}
                            onClick={() => setJobForm({ ...jobForm, applicationDeadline: value })}
                          >
                            +{days} days
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-input-group admin-reopen-date-field">
                    <label htmlFor="admin-reopen-deadline">Application deadline</label>
                    <input
                      id="admin-reopen-deadline"
                      type="date"
                      required
                      min={minDeadline}
                      value={jobForm.applicationDeadline}
                      onChange={(e) => setJobForm({ ...jobForm, applicationDeadline: e.target.value })}
                    />
                    <p className="muted">Past dates are blocked.</p>
                  </div>
                </div>

                <div className="admin-reopen-footer">
                  <button
                    type="button"
                    className="btn-auth-submit"
                    onClick={goReopenStep2}
                    disabled={!deadlineOk}
                  >
                    Continue
                  </button>
                </div>
              </section>
            ) : (
              <section className="admin-reopen-step-panel" aria-labelledby="reopen-step2-title">
                <div className="admin-reopen-step-head">
                  <p className="admin-reopen-kicker">Step 2 of 2</p>
                  <h2 id="reopen-step2-title">Review posting details</h2>
                  <p>Confirm the vacancy looks right, then reopen it for candidates.</p>
                </div>

                <div className="admin-reopen-deadline-chip">
                  <div>
                    <span>New deadline</span>
                    <strong>
                      {new Date(`${jobForm.applicationDeadline}T00:00:00`).toLocaleDateString(
                        undefined,
                        { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
                      )}
                    </strong>
                  </div>
                  <button type="button" className="admin-jobs-action" onClick={() => setReopenStep(1)}>
                    Change
                  </button>
                </div>

                <div className="admin-reopen-form">
                  <AdminJobFormFields
                    value={jobForm}
                    onChange={setJobForm}
                    hideCompanySelect
                    hideDeadline
                  />
                </div>

                <div className="admin-reopen-footer is-split">
                  <button
                    type="button"
                    className="btn-clear-filters"
                    onClick={() => setReopenStep(1)}
                    disabled={busy}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-auth-submit"
                    disabled={busy || !deadlineOk}
                    onClick={() => {
                      setActionError(null);
                      reopenMutation.mutate();
                    }}
                  >
                    {reopenMutation.isPending ? 'Reopening…' : 'Save & reopen'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {editing && canEdit && jobForm && !isReopening && (
        <div className="admin-reopen-shell">
          <div className="card admin-reopen-panel">
            <div className="admin-reopen-step-head">
              <p className="admin-reopen-kicker">Edit mode</p>
              <h2>Edit posting</h2>
              <p>Update vacancy details, then save your changes.</p>
            </div>
            <form
              className="admin-reopen-form"
              onSubmit={(e) => {
                e.preventDefault();
                setActionError(null);
                updateMutation.mutate();
              }}
            >
              <AdminJobFormFields value={jobForm} onChange={setJobForm} hideCompanySelect />
              <div className="admin-reopen-footer">
                <button
                  type="submit"
                  className="btn-auth-submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!editing && (
        <JobDetailContent
          job={job}
          featuredJobs={featuredQuery.data?.data ?? []}
          backFallback="/admin/jobs"
          previewNote={previewNote}
        />
      )}

      {!editing && (
        <aside className="card admin-job-changes-card">
          <div className="admin-job-changes-head">
            <h2 className="admin-jobs-card-title">Edit history</h2>
            <p className="admin-job-changes-copy">
              Field-by-field updates for this posting. Before is the old value; After is what it
              became.
            </p>
          </div>
          {revisions.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No edits recorded yet.
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
                        <span className="admin-change-label">Changed: {change.label}</span>
                        <div className="admin-change-pair">
                          <div className="admin-change-from">
                            <span className="admin-change-side-label">Before</span>
                            <p>{change.from || '—'}</p>
                          </div>
                          <div className="admin-change-to">
                            <span className="admin-change-side-label">After</span>
                            <p>{change.to || '—'}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
