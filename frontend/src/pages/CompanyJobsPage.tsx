import { CompanyVerificationNotice } from '../components/CompanyVerificationNotice';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { Job, JobStatus } from '../types/api';

const OPEN_STATUSES: JobStatus[] = ['published', 'pending_review', 'draft'];
const HISTORY_STATUSES: JobStatus[] = ['closed', 'rejected', 'archived'];

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const statusBadge = (status: string) => {
  if (status === 'published') {
    return <span className="status-badge status-published">Published</span>;
  }
  if (status === 'pending_review') {
    return <span className="status-badge status-review">Under Review</span>;
  }
  if (status === 'rejected') {
    return <span className="status-badge status-rejected">Rejected</span>;
  }
  if (status === 'draft') {
    return <span className="status-badge status-draft">Draft</span>;
  }
  return <span className="status-badge status-closed">{status.replace('_', ' ')}</span>;
};

export const CompanyJobsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
  });

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobsQuery = useQuery({
    queryKey: ['company', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId),
  });

  const reopenMutation = useMutation({
    mutationFn: ({ jobId, applicationDeadline }: { jobId: string; applicationDeadline: string }) =>
      employerApi.reopenJob(companyId!, jobId, applicationDeadline),
    onSuccess: (job) => {
      setRowError((prev) => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      setMessage(
        job.status === 'published'
          ? `"${job.title}" is live again.`
          : `"${job.title}" was sent for review. An administrator has to post it before it appears on the public board.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['company', 'jobs', companyId] });
      setTab('open');
    },
    onError: (err: Error, variables) => {
      setRowError((prev) => ({ ...prev, [variables.jobId]: err.message }));
    },
  });

  const companies = companiesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const publishedCount = jobs.filter((j) => j.status === 'published').length;
  const reviewCount = jobs.filter((j) => j.status === 'pending_review').length;
  const openJobs = useMemo(
    () => jobs.filter((job) => OPEN_STATUSES.includes(job.status)),
    [jobs],
  );
  const historyJobs = useMemo(
    () => jobs.filter((job) => HISTORY_STATUSES.includes(job.status)),
    [jobs],
  );
  const visibleJobs = tab === 'open' ? openJobs : historyJobs;
  const minDeadline = utcTodayIso();

  const handleReopen = (job: Job) => {
    const applicationDeadline = deadlines[job.id]?.trim();
    if (!applicationDeadline) {
      setRowError((prev) => ({ ...prev, [job.id]: 'Choose a new deadline.' }));
      return;
    }
    if (applicationDeadline < minDeadline) {
      setRowError((prev) => ({ ...prev, [job.id]: 'Choose a deadline of today or later.' }));
      return;
    }
    setRowError((prev) => {
      const next = { ...prev };
      delete next[job.id];
      return next;
    });
    setMessage(null);
    reopenMutation.mutate({ jobId: job.id, applicationDeadline });
  };

  return (
    <div className="jobs-list-container">
      {companyQuery.data && <CompanyVerificationNotice company={companyQuery.data} />}
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <div className="company-portal-header-row">
          <div>
            <span className="section-eyebrow">Employer Portal</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
              {companyQuery.data?.name ?? 'Company'} — Job Postings
            </h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              {companyQuery.data?.verificationStatus !== 'verified'
                ? 'Business licence approval is required before creating vacancies.'
                : companyQuery.data?.canSelfPublishJobs &&
                    companyQuery.data.verificationStatus === 'verified'
                  ? 'Your organization is verified to publish vacancies directly to the board.'
                  : 'New vacancies wait for an administrator to review and post them.'}
            </p>
          </div>

          <div className="company-portal-actions">
            {companies.length > 1 && (
              <select
                value={companyId}
                onChange={(e) => navigate(`/company/${e.target.value}/jobs`)}
                className="select-company-switcher"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {companyQuery.data?.verificationStatus === 'verified' && (
              <Link to={`/company/${companyId}/jobs/new`} className="btn-nav-register">
                + Post New Opportunity
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="cv-stats-row" style={{ marginBottom: '2rem' }}>
        <div className="cv-stat-box">
          <span className="cv-stat-label">Open</span>
          <strong className="cv-stat-number">{openJobs.length}</strong>
          <span className="cv-stat-sub">Live, review, and drafts</span>
        </div>
        <div className="cv-stat-box">
          <span className="cv-stat-label">Published Live</span>
          <strong className="cv-stat-number text-primary">{publishedCount}</strong>
          <span className="cv-stat-sub">Visible to candidates</span>
        </div>
        <div className="cv-stat-box">
          <span className="cv-stat-label">History</span>
          <strong className="cv-stat-number">{historyJobs.length}</strong>
          <span className="cv-stat-sub">Closed, rejected, archived</span>
        </div>
        <div className="cv-stat-box">
          <span className="cv-stat-label">Under Review</span>
          <strong className="cv-stat-number" style={{ color: '#d97706' }}>
            {reviewCount}
          </strong>
          <span className="cv-stat-sub">Pending approval</span>
        </div>
      </div>

      {message && <p className="employer-jobs-banner">{message}</p>}

      {jobsQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">💼</div>
          <h3>No job postings created yet</h3>
          <p>Post your first employment opportunity to find qualified talent across Ethiopia.</p>
          <Link
            to={`/company/${companyId}/jobs/new`}
            className="btn-nav-register"
            style={{ marginTop: '0.75rem' }}
          >
            + Create First Job Posting
          </Link>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="employer-jobs-panel">
          <div className="employer-jobs-tabs" role="tablist" aria-label="Job postings">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'open'}
              className={`employer-jobs-tab${tab === 'open' ? ' is-active' : ''}`}
              onClick={() => setTab('open')}
            >
              Open ({openJobs.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              className={`employer-jobs-tab${tab === 'history' ? ' is-active' : ''}`}
              onClick={() => setTab('history')}
            >
              History ({historyJobs.length})
            </button>
          </div>

          {visibleJobs.length === 0 ? (
            <div className="empty-results-box">
              <h3>{tab === 'open' ? 'No open postings' : 'No posted job history yet'}</h3>
              <p>
                {tab === 'open'
                  ? 'Post a new vacancy, or open History to set a new deadline on a closed posting.'
                  : 'Jobs that pass their deadline or are closed appear here so you can post them again.'}
              </p>
            </div>
          ) : (
            <div className="employer-jobs-list">
              {visibleJobs.map((job) => (
                <div key={job.id} className="employer-job-row-card">
                  <div className="emp-job-info">
                    <div className="emp-job-title-row">
                      <h3 className="emp-job-title">{job.title}</h3>
                      {statusBadge(job.status)}
                    </div>
                    <div className="emp-job-meta">
                      <span className="emp-meta-item">
                        Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                      </span>
                      <span className="emp-meta-item">
                        {job.employmentType.replace('_', ' ')}
                      </span>
                      <span className="emp-meta-item">
                        {job._count?.applications ?? 0} applications
                      </span>
                      {job.vacanciesCount > 1 && (
                        <span className="emp-meta-item">{job.vacanciesCount} openings</span>
                      )}
                    </div>
                    {rowError[job.id] && (
                      <p className="emp-job-error" role="alert">
                        {rowError[job.id]}
                      </p>
                    )}
                  </div>

                  <div className="emp-job-actions">
                    {job.status === 'published' && (
                      <Link to={`/jobs/${job.slug}`} className="btn btn-sm btn-secondary" target="_blank">
                        View Public Post
                      </Link>
                    )}
                    {['draft', 'pending_review', 'rejected', 'published'].includes(job.status) && (
                      <Link
                        to={`/company/${companyId}/jobs/${job.id}/edit`}
                        className="btn btn-sm btn-primary"
                      >
                        Edit Post
                      </Link>
                    )}
                    {job.status === 'closed' && (
                      <form
                        className="emp-job-reopen"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleReopen(job);
                        }}
                      >
                        <label>
                          New deadline
                          <input
                            type="date"
                            min={minDeadline}
                            value={deadlines[job.id] ?? ''}
                            onChange={(e) =>
                              setDeadlines((prev) => ({ ...prev, [job.id]: e.target.value }))
                            }
                          />
                        </label>
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary"
                          disabled={reopenMutation.isPending && reopenMutation.variables?.jobId === job.id}
                        >
                          {reopenMutation.isPending && reopenMutation.variables?.jobId === job.id
                            ? 'Posting…'
                            : 'Post again'}
                        </button>
                      </form>
                    )}
                    {job.status === 'archived' && <span className="muted">Archived</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
