import { CompanyVerificationNotice } from '../components/CompanyVerificationNotice';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { Job } from '../types/api';
import { jobPostedLabel } from '../utils/jobListing';

const PAGE_SIZE = 10;

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface JobUrgency {
  isExpired: boolean;
  isUrgent: boolean;
  daysRemaining: number;
  label: string;
  badgeType: 'expired' | 'closing' | 'normal';
}

function isPastPosting(job: Job, expired: boolean): boolean {
  return expired || ['closed', 'rejected', 'archived'].includes(job.status);
}

function getJobUrgency(job: Job): JobUrgency {
  if (job.status === 'closed') {
    return {
      isExpired: true,
      isUrgent: false,
      daysRemaining: -1,
      label: 'Closed',
      badgeType: 'normal',
    };
  }
  if (!job.applicationDeadline) {
    return {
      isExpired: false,
      isUrgent: false,
      daysRemaining: 999,
      label: 'No deadline set',
      badgeType: 'normal',
    };
  }
  const deadline = new Date(job.applicationDeadline);
  if (Number.isNaN(deadline.getTime())) {
    return {
      isExpired: false,
      isUrgent: false,
      daysRemaining: 999,
      label: job.applicationDeadline,
      badgeType: 'normal',
    };
  }

  // End of deadline day comparison
  const deadlineEnd = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
    23,
    59,
    59,
    999,
  );
  const now = new Date();
  const diffMs = deadlineEnd.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const formattedDate = deadline.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (diffMs < 0) {
    const daysAgo = Math.max(1, Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24))));
    return {
      isExpired: true,
      isUrgent: true,
      daysRemaining: days,
      label: daysAgo === 1 ? `Expired yesterday (${formattedDate})` : `Expired ${daysAgo} days ago (${formattedDate})`,
      badgeType: 'expired',
    };
  }
  if (days <= 0) {
    return {
      isExpired: false,
      isUrgent: true,
      daysRemaining: 0,
      label: `Closes today (${formattedDate})`,
      badgeType: 'closing',
    };
  }
  if (days === 1) {
    return {
      isExpired: false,
      isUrgent: true,
      daysRemaining: 1,
      label: `1 day left (${formattedDate})`,
      badgeType: 'closing',
    };
  }
  if (days <= 3) {
    return {
      isExpired: false,
      isUrgent: true,
      daysRemaining: days,
      label: `${days} days left (${formattedDate})`,
      badgeType: 'closing',
    };
  }
  return {
    isExpired: false,
    isUrgent: false,
    daysRemaining: days,
    label: `Closes in ${days} days (${formattedDate})`,
    badgeType: 'normal',
  };
}

const renderStatusBadge = (job: Job, urgency: JobUrgency) => {
  if (urgency.isExpired && job.status === 'published') {
    return <span className="status-badge status-expired">Deadline Passed</span>;
  }
  if (job.status === 'published') {
    return <span className="status-badge status-published">Published Live</span>;
  }
  if (job.status === 'pending_review') {
    return <span className="status-badge status-review">Under Review</span>;
  }
  if (job.status === 'rejected') {
    return <span className="status-badge status-rejected">Rejected</span>;
  }
  if (job.status === 'draft') {
    return <span className="status-badge status-draft">Draft</span>;
  }
  if (job.status === 'closed') {
    return <span className="status-badge status-closed">Closed</span>;
  }
  return <span className="status-badge status-closed">{job.status.replace('_', ' ')}</span>;
};

export const CompanyJobsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  // Reopen / Timeline Update Modal
  const [reopenTarget, setReopenTarget] = useState<Job | null>(null);
  const [reopenDeadline, setReopenDeadline] = useState<string>(addDaysIso(30));
  const [reopenError, setReopenError] = useState<string | null>(null);

  // Close Confirmation Modal
  const [closeTarget, setCloseTarget] = useState<Job | null>(null);

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
      setReopenTarget(null);
      setReopenError(null);
      setMessage(
        job.status === 'published'
          ? `"${job.title}" has been updated with a new deadline and is now live again.`
          : `"${job.title}" has been updated and submitted for administrator review.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['company', 'jobs', companyId] });
      setStatusFilter('open');
      setCurrentPage(1);
    },
    onError: (err: Error) => {
      setReopenError(err.message || 'Failed to update and reopen job');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (jobId: string) => employerApi.closeJob(companyId!, jobId),
    onSuccess: (job) => {
      setCloseTarget(null);
      setMessage(`"${job.title}" has been closed and moved to History.`);
      void queryClient.invalidateQueries({ queryKey: ['company', 'jobs', companyId] });
    },
    onError: (err: Error) => {
      setMessage(`Failed to close job: ${err.message}`);
    },
  });

  const companies = companiesQuery.data ?? [];
  const rawJobs = jobsQuery.data ?? [];

  const totals = rawJobs.reduce(
    (counts, job) => {
      if (isPastPosting(job, getJobUrgency(job).isExpired)) counts.past++;
      else if (job.status === 'published') counts.live++;
      else if (job.status === 'pending_review') counts.review++;
      return counts;
    },
    { live: 0, review: 0, past: 0 },
  );

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let list = rawJobs.filter((job) => {
      if (statusFilter === 'all') return true;
      const expired = getJobUrgency(job).isExpired;
      const inHistory = isPastPosting(job, expired);

      if (statusFilter === 'open') return !inHistory;
      if (statusFilter === 'history') return inHistory;
      if (statusFilter === 'expired') return expired;
      if (statusFilter === 'closed' || statusFilter === 'rejected') return job.status === statusFilter;
      return !inHistory && job.status === statusFilter;
    });

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        const titleMatch = j.title?.toLowerCase().includes(q);
        const categoryMatch = j.category?.name?.toLowerCase().includes(q);
        const locMatch = j.location?.name?.toLowerCase().includes(q) || j.location?.city?.toLowerCase().includes(q);
        const refMatch = j.referenceCode?.toLowerCase().includes(q);
        const typeMatch = j.employmentType?.toLowerCase().replace('_', ' ').includes(q);
        return titleMatch || categoryMatch || locMatch || refMatch || typeMatch;
      });
    }

    return list.sort((a, b) => {
      const tA = new Date(a.createdAt || a.postedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.postedAt || 0).getTime();
      return tB - tA;
    });
  }, [rawJobs, searchQuery, statusFilter]);

  // Pagination calculation
  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageValid = Math.min(currentPage, totalPages);
  const startIndex = (pageValid - 1) * PAGE_SIZE;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + PAGE_SIZE);

  const minDeadline = utcTodayIso();

  const handleOpenReopenModal = (job: Job) => {
    setReopenTarget(job);
    setReopenDeadline(addDaysIso(30));
    setReopenError(null);
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget) return;
    if (!reopenDeadline.trim()) {
      setReopenError('Please select a valid deadline date.');
      return;
    }
    if (reopenDeadline < minDeadline) {
      setReopenError('The deadline must be today or in the future.');
      return;
    }
    reopenMutation.mutate({ jobId: reopenTarget.id, applicationDeadline: reopenDeadline });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('open');
    setCurrentPage(1);
  };

  return (
    <div className="jobs-list-container employer-postings">
      {companyQuery.data && <CompanyVerificationNotice company={companyQuery.data} />}

      <header className="emp-page-header">
        <div className="emp-page-header-copy">
          <p className="emp-page-kicker">{companyQuery.data?.name ?? 'Company'}</p>
          <h1>Job postings</h1>
          <p>
            {companyQuery.data?.verificationStatus !== 'verified'
              ? 'Business licence approval is required before creating vacancies.'
              : 'Create, edit, and manage your vacancies. Review applicants from Review candidates.'}
          </p>
        </div>
        <div className="emp-page-header-actions">
          {companies.length > 1 && (
            <select
              value={companyId}
              onChange={(e) => navigate(`/company/${e.target.value}/jobs`)}
              className="select-company-switcher"
              aria-label="Switch company"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {companyQuery.data?.verificationStatus === 'verified' && (
            <Link to={`/company/${companyId}/jobs/new`} className="btn">
              Post a job
            </Link>
          )}
        </div>
      </header>

      {jobsQuery.isSuccess && rawJobs.length > 0 && (
        <section className="emp-summary-strip" aria-label="Posting totals">
          <div><span>{totals.live}</span><small>Live</small></div>
          <div><span>{totals.review}</span><small>Under review</small></div>
          <div><span>{totals.past}</span><small>Past</small></div>
        </section>
      )}

      {message && (
        <div className="employer-jobs-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {jobsQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {!jobsQuery.isLoading && rawJobs.length === 0 && (
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

      {rawJobs.length > 0 && (
        <div className="employer-jobs-panel">
          {/* Search, Filter & Sort Toolbar for Many Jobs */}
          <div className="employer-management-bar">
            <div className="employer-search-wrap">
              <input
                type="search"
                className="employer-search-input"
                placeholder="Search jobs…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Search jobs"
              />
            </div>

            <div className="employer-status-filter" role="group" aria-label="Show jobs">
              <span className="employer-job-filter-label">Show</span>
              <div className="employer-status-chips">
                {[
                  ['open', 'Open'],
                  ['published', 'Live'],
                  ['pending_review', 'Review'],
                  ['draft', 'Drafts'],
                  ['history', 'History'],
                  ['all', 'All'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`emp-filter-chip${statusFilter === value ? ' is-active' : ''}`}
                    aria-pressed={statusFilter === value}
                    onClick={() => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(searchQuery || statusFilter !== 'open') && (
              <button type="button" className="btn-clear-filters" onClick={handleResetFilters}>
                Clear Filters
              </button>
            )}
          </div>

          <p className="employer-result-count" role="status">
            {totalItems} {totalItems === 1 ? 'job' : 'jobs'} found
          </p>

          {filteredJobs.length === 0 ? (
            <div className="empty-results-box" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-icon-circle">📂</div>
              <h3>No matching job postings</h3>
              <p>Choose another job status or clear your search to see more postings.</p>
              {(searchQuery || statusFilter !== 'open') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-sm btn-secondary"
                  style={{ marginTop: '0.85rem' }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="employer-jobs-list">
              {paginatedJobs.map((job) => {
                const urgency = getJobUrgency(job);
                const isExpiredOrClosed = urgency.isExpired || ['closed', 'rejected', 'archived'].includes(job.status);
                const workplaceLabel = job.workplaceType
                  ? `${job.workplaceType.replace('_', ' ')}${job.location?.city ? ` · ${job.location.city}` : ''}`
                  : job.location?.city || null;
                const detailParts = [
                  job.category?.name,
                  job.employmentType?.replace('_', ' '),
                  workplaceLabel,
                  job.vacanciesCount > 1 ? `${job.vacanciesCount} openings` : null,
                ].filter(Boolean) as string[];

                return (
                  <article key={job.id} className="employer-job-row-card">
                    <div className="emp-job-card-body">
                      <div className="emp-job-card-main">
                        <div className="emp-job-title-row">
                          <Link
                            to={job.status === 'published' ? `/jobs/${job.slug}` : `/company/${companyId}/jobs/${job.id}/edit`}
                            className="emp-job-title"
                          >
                            {job.title}
                          </Link>
                          {renderStatusBadge(job, urgency)}
                        </div>

                        <p className="emp-job-details employer-desktop-label">
                          {detailParts.map((part, index) => (
                            <React.Fragment key={`${job.id}-detail-${index}`}>
                              {index > 0 && <span className="emp-job-details-sep" aria-hidden="true">·</span>}
                              <span>{part}</span>
                            </React.Fragment>
                          ))}
                          {detailParts.length > 0 && <span className="emp-job-details-sep" aria-hidden="true">·</span>}
                          <span className="emp-job-posted">Posted {jobPostedLabel(job.postedAt || job.createdAt)}</span>
                        </p>

                        <div className="emp-job-metrics">
                          {typeof job._count?.views === 'number' && (
                            <div className="emp-job-metric employer-desktop-label">
                              <span className="emp-job-metric-value">{job._count.views}</span>
                              <span className="emp-job-metric-label">Views</span>
                            </div>
                          )}
                          <div className={`emp-job-metric emp-job-deadline emp-job-deadline--${urgency.badgeType}`}>
                            <span className="emp-job-deadline-text">{urgency.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="emp-job-actions">
                        {job.status === 'published' && !urgency.isExpired && (
                          <>
                            <Link
                              to={`/jobs/${job.slug}`}
                              className="btn btn-sm btn-secondary"
                              target="_blank"
                              title="View public posting as candidates see it"
                            >
                              View Live
                            </Link>
                            <Link
                              to={`/company/${companyId}/jobs/${job.id}/edit`}
                              className="btn btn-sm btn-secondary"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-close-job"
                              onClick={() => setCloseTarget(job)}
                              title="Close this job and move to history"
                            >
                              Close
                            </button>
                          </>
                        )}

                        {isExpiredOrClosed && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary emp-job-reopen-btn"
                              onClick={() => handleOpenReopenModal(job)}
                            >
                              Republish
                            </button>
                            <Link
                              to={`/company/${companyId}/jobs/${job.id}/edit`}
                              className="btn btn-sm btn-secondary"
                            >
                              Edit
                            </Link>
                          </>
                        )}

                        {job.status === 'draft' && !urgency.isExpired && (
                          <Link
                            to={`/company/${companyId}/jobs/${job.id}/edit`}
                            className="btn btn-sm btn-primary"
                          >
                            Continue Draft
                          </Link>
                        )}

                        {job.status === 'pending_review' && !urgency.isExpired && (
                          <Link
                            to={`/company/${companyId}/jobs/${job.id}/edit`}
                            className="btn btn-sm btn-secondary"
                          >
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="employer-pagination-wrap">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalItems)} of {totalItems} postings
              </span>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="emp-page-btn"
                  disabled={pageValid <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`emp-page-btn${p === pageValid ? ' is-active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="emp-page-btn"
                  disabled={pageValid >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Republish / Update Timeline Modal */}
      {reopenTarget && (
        <div
          className="emp-modal-overlay"
          onClick={() => !reopenMutation.isPending && setReopenTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reopen-modal-title"
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="reopen-modal-title" className="emp-modal-title">
                  Republish Opportunity
                </h3>
                <p className="emp-modal-subtitle">
                  Extend the application timeline to release and reactivate &ldquo;{reopenTarget.title}&rdquo;.
                </p>
              </div>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setReopenTarget(null)}
                disabled={reopenMutation.isPending}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReopen}>
              <div className="emp-modal-body">
                {reopenError && (
                  <p className="emp-job-error" style={{ marginBottom: '1rem' }} role="alert">
                    {reopenError}
                  </p>
                )}

                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Quick Timeline Extension:
                </label>
                <div className="emp-preset-pills-row">
                  <button
                    type="button"
                    className={`emp-preset-pill-btn${reopenDeadline === addDaysIso(14) ? ' is-selected' : ''}`}
                    onClick={() => setReopenDeadline(addDaysIso(14))}
                  >
                    +14 Days (2 Weeks)
                  </button>
                  <button
                    type="button"
                    className={`emp-preset-pill-btn${reopenDeadline === addDaysIso(30) ? ' is-selected' : ''}`}
                    onClick={() => setReopenDeadline(addDaysIso(30))}
                  >
                    +30 Days (1 Month)
                  </button>
                  <button
                    type="button"
                    className={`emp-preset-pill-btn${reopenDeadline === addDaysIso(60) ? ' is-selected' : ''}`}
                    onClick={() => setReopenDeadline(addDaysIso(60))}
                  >
                    +60 Days (2 Months)
                  </button>
                </div>

                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  New Application Deadline Date:
                </label>
                <input
                  type="date"
                  min={minDeadline}
                  value={reopenDeadline}
                  onChange={(e) => setReopenDeadline(e.target.value)}
                  className="employer-search-input"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '42px', fontSize: '0.95rem' }}
                  required
                />

                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.95rem 1.15rem',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1px solid #edf2f7',
                    fontSize: '0.84rem',
                    color: '#475569',
                    lineHeight: 1.55,
                  }}
                >
                  {companyQuery.data?.canSelfPublishJobs && companyQuery.data.verificationStatus === 'verified' ? (
                    <span>
                      ⚡ <strong>Instant Release:</strong> Because your organization is verified, this job will immediately become active and visible to job seekers upon republishing.
                    </span>
                  ) : (
                    <span>
                      ℹ️ <strong>Admin Review:</strong> After submitting the updated timeline, this job will be submitted to the review queue for administrator confirmation.
                    </span>
                  )}
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setReopenTarget(null)}
                  disabled={reopenMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={reopenMutation.isPending}
                  style={{ minWidth: '130px' }}
                >
                  {reopenMutation.isPending ? 'Publishing...' : 'Republish Job Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Job Confirmation Modal */}
      {closeTarget && (
        <div
          className="emp-modal-overlay"
          onClick={() => !closeMutation.isPending && setCloseTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-modal-title"
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="close-modal-title" className="emp-modal-title">
                  Close Job Vacancy
                </h3>
                <p className="emp-modal-subtitle">
                  Are you sure you want to close &ldquo;{closeTarget.title}&rdquo;?
                </p>
              </div>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setCloseTarget(null)}
                disabled={closeMutation.isPending}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="emp-modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Closing this vacancy will immediately remove it from the public candidate job board. The vacancy, along with its applicant count and statistics, will be safely preserved in the <strong>History</strong> filter so you can update its timeline and republish it at any time.
              </p>
            </div>

            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCloseTarget(null)}
                disabled={closeMutation.isPending}
              >
                Keep Active
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 700 }}
                onClick={() => closeMutation.mutate(closeTarget.id)}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? 'Closing...' : 'Confirm & Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
