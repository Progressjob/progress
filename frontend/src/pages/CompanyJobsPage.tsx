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

  const [tab, setTab] = useState<'open' | 'history' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'closing_soon' | 'deadline_latest' | 'applications' | 'title'>('newest');
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
      setTab('open');
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

  // Categorize jobs into Open vs History
  const { openJobs, historyJobs, publishedCount, reviewCount } = useMemo(() => {
    const open: Job[] = [];
    const history: Job[] = [];
    let pubCount = 0;
    let revCount = 0;

    for (const job of rawJobs) {
      const urgency = getJobUrgency(job);
      const isExpired = urgency.isExpired;
      const isClosedState = ['closed', 'rejected', 'archived'].includes(job.status);

      if (isExpired || isClosedState) {
        history.push(job);
      } else {
        open.push(job);
        if (job.status === 'published') pubCount++;
        if (job.status === 'pending_review') revCount++;
      }
    }

    return {
      openJobs: open,
      historyJobs: history,
      publishedCount: pubCount,
      reviewCount: revCount,
    };
  }, [rawJobs]);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let list: Job[] = [];
    if (tab === 'open') list = openJobs;
    else if (tab === 'history') list = historyJobs;
    else list = rawJobs;

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

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        list = list.filter((j) => getJobUrgency(j).isExpired);
      } else {
        list = list.filter((j) => j.status === statusFilter && !getJobUrgency(j).isExpired);
      }
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'closing_soon') {
        const dA = new Date(a.applicationDeadline).getTime() || 0;
        const dB = new Date(b.applicationDeadline).getTime() || 0;
        return dA - dB;
      }
      if (sortBy === 'deadline_latest') {
        const dA = new Date(a.applicationDeadline).getTime() || 0;
        const dB = new Date(b.applicationDeadline).getTime() || 0;
        return dB - dA;
      }
      if (sortBy === 'applications') {
        const countA = a._count?.applications ?? 0;
        const countB = b._count?.applications ?? 0;
        return countB - countA;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // default: newest
      const tA = new Date(a.createdAt || a.postedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.postedAt || 0).getTime();
      return tB - tA;
    });
  }, [rawJobs, openJobs, historyJobs, tab, searchQuery, statusFilter, sortBy]);

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
    setStatusFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  return (
    <div className="jobs-list-container">
      {companyQuery.data && <CompanyVerificationNotice company={companyQuery.data} />}

      {/* Header */}
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2.15rem' }}>
        <div className="company-portal-header-row">
          <div>
            <span className="section-eyebrow">Employer Portal</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
              {companyQuery.data?.name ?? 'Company'} — Job Postings
            </h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              {companyQuery.data?.verificationStatus !== 'verified'
                ? 'Business licence approval is required before creating vacancies.'
                : companyQuery.data?.canSelfPublishJobs && companyQuery.data.verificationStatus === 'verified'
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
              <Link to={`/company/${companyId}/jobs/new`} className="btn-nav-register">
                + Post New Opportunity
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="employer-stats-grid">
        <div
          className={`emp-stat-card${tab === 'open' && statusFilter === 'all' ? ' is-active-filter' : ''}`}
          onClick={() => {
            setTab('open');
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          title="Click to view open positions"
        >
          <div className="emp-stat-card-header">
            <span className="cv-stat-label">Active & Open</span>
            <span className="emp-stat-badge-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
              💼
            </span>
          </div>
          <strong className="cv-stat-number">{openJobs.length}</strong>
          <span className="cv-stat-sub">Live, review, and drafts</span>
        </div>

        <div
          className={`emp-stat-card${tab === 'open' && statusFilter === 'published' ? ' is-active-filter' : ''}`}
          onClick={() => {
            setTab('open');
            setStatusFilter('published');
            setCurrentPage(1);
          }}
          title="Click to view published jobs"
        >
          <div className="emp-stat-card-header">
            <span className="cv-stat-label">Published Live</span>
            <span className="emp-stat-badge-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              🟢
            </span>
          </div>
          <strong className="cv-stat-number text-primary">{publishedCount}</strong>
          <span className="cv-stat-sub">Accepting active applications</span>
        </div>

        <div
          className={`emp-stat-card${tab === 'open' && statusFilter === 'pending_review' ? ' is-active-filter' : ''}`}
          onClick={() => {
            setTab('open');
            setStatusFilter('pending_review');
            setCurrentPage(1);
          }}
          title="Click to view jobs under moderation"
        >
          <div className="emp-stat-card-header">
            <span className="cv-stat-label">Under Review</span>
            <span className="emp-stat-badge-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
              ⏳
            </span>
          </div>
          <strong className="cv-stat-number" style={{ color: '#d97706' }}>
            {reviewCount}
          </strong>
          <span className="cv-stat-sub">Pending admin approval</span>
        </div>

        <div
          className={`emp-stat-card${tab === 'history' ? ' is-active-filter' : ''}`}
          onClick={() => {
            setTab('history');
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          title="Click to view expired and closed jobs"
        >
          <div className="emp-stat-card-header">
            <span className="cv-stat-label">History & Closed</span>
            <span className="emp-stat-badge-icon" style={{ background: '#f8fafc', color: '#64748b' }}>
              📁
            </span>
          </div>
          <strong className="cv-stat-number">{historyJobs.length}</strong>
          <span className="cv-stat-sub">Expired deadline or closed</span>
        </div>
      </div>

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
          {/* Navigation Tabs and Controls */}
          <div className="employer-tabs-header">
            <div className="employer-tabs-nav" role="tablist" aria-label="Job postings filter tabs">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'open'}
                className={`employer-jobs-tab${tab === 'open' ? ' is-active' : ''}`}
                onClick={() => {
                  setTab('open');
                  setCurrentPage(1);
                }}
              >
                Open & Active
                <span className="employer-job-pill-count">{openJobs.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'history'}
                className={`employer-jobs-tab${tab === 'history' ? ' is-active' : ''}`}
                onClick={() => {
                  setTab('history');
                  setCurrentPage(1);
                }}
              >
                History & Closed
                <span className="employer-job-pill-count">{historyJobs.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'all'}
                className={`employer-jobs-tab${tab === 'all' ? ' is-active' : ''}`}
                onClick={() => {
                  setTab('all');
                  setCurrentPage(1);
                }}
              >
                All Postings
                <span className="employer-job-pill-count">{rawJobs.length}</span>
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Showing {totalItems} {totalItems === 1 ? 'vacancy' : 'vacancies'}
            </div>
          </div>

          {/* Search, Filter & Sort Toolbar for Many Jobs */}
          <div className="employer-management-bar">
            <div className="employer-search-wrap">
              <span className="employer-search-icon">🔍</span>
              <input
                type="text"
                className="employer-search-input"
                placeholder="Search jobs by title, department, or keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="employer-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="employer-filter-controls">
              <select
                className="employer-select-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Live</option>
                <option value="pending_review">Under Review</option>
                <option value="draft">Draft</option>
                <option value="expired">Deadline Passed</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                className="employer-select-filter"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort by"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="closing_soon">Sort: Deadline (Closing Soon)</option>
                <option value="deadline_latest">Sort: Deadline (Latest)</option>
                <option value="applications">Sort: Most Applications</option>
                <option value="title">Sort: Job Title (A–Z)</option>
              </select>

              {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={handleResetFilters}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Jobs List */}
          {filteredJobs.length === 0 ? (
            <div className="empty-results-box" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-icon-circle">📂</div>
              <h3>
                {searchQuery || statusFilter !== 'all'
                  ? 'No matching job postings found'
                  : tab === 'open'
                    ? 'No open postings currently'
                    : 'No past job history'}
              </h3>
              <p>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try clearing your search terms or filters to see all available opportunities.'
                  : tab === 'open'
                    ? 'Create a new job posting or check History to reactivate closed positions.'
                    : 'Jobs whose application deadline has expired or were manually closed will appear here for easy republication.'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
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

                      {detailParts.length > 0 && (
                        <p className="emp-job-details">
                          {detailParts.map((part, index) => (
                            <React.Fragment key={`${job.id}-detail-${index}`}>
                              {index > 0 && <span className="emp-job-details-sep" aria-hidden="true">·</span>}
                              <span>{part}</span>
                            </React.Fragment>
                          ))}
                        </p>
                      )}

                      <div className="emp-job-metrics">
                        <div className="emp-job-metric">
                          <span className="emp-job-metric-value">{job._count?.applications ?? 0}</span>
                          <span className="emp-job-metric-label">Applications</span>
                        </div>
                        {typeof job._count?.views === 'number' && (
                          <div className="emp-job-metric">
                            <span className="emp-job-metric-value">{job._count.views}</span>
                            <span className="emp-job-metric-label">Views</span>
                          </div>
                        )}
                        <div
                          className={`emp-job-metric emp-job-deadline emp-job-deadline--${urgency.badgeType}`}
                        >
                          <span className="emp-job-metric-label">Timeline</span>
                          <span className="emp-job-metric-value emp-job-deadline-text">{urgency.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="emp-job-card-footer">
                      <span className="emp-job-posted">
                        Posted {jobPostedLabel(job.postedAt || job.createdAt)}
                      </span>

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
                              Close Job
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
                              Update Timeline & Republish
                            </button>
                            <Link
                              to={`/company/${companyId}/jobs/${job.id}/edit`}
                              className="btn btn-sm btn-secondary"
                            >
                              Edit Full Post
                            </Link>
                          </>
                        )}

                        {job.status === 'draft' && !urgency.isExpired && (
                          <Link
                            to={`/company/${companyId}/jobs/${job.id}/edit`}
                            className="btn btn-sm btn-primary"
                          >
                            Continue Editing Draft
                          </Link>
                        )}

                        {job.status === 'pending_review' && !urgency.isExpired && (
                          <Link
                            to={`/company/${companyId}/jobs/${job.id}/edit`}
                            className="btn btn-sm btn-secondary"
                          >
                            Review & Edit
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
                Closing this vacancy will immediately remove it from the public candidate job board. The vacancy, along with its applicant count and statistics, will be safely preserved in your <strong>History & Closed</strong> tab so you can update its timeline and republish it at any time.
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
