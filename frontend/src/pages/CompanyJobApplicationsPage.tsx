import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { employerApi } from '../api/employer';
import { useMarkCandidateNotificationsSeen } from '../hooks/useMarkCandidateNotificationsSeen';
import type { ApplicationStatus } from '../types/api';
import {
  applicationStatusLabel,
  applicationStatusPillClass,
  formatApplicationStatus,
} from '../utils/applicationStatus';

const PIPELINE_STATUSES: ApplicationStatus[] = [
  'submitted',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
];

function candidateInitials(firstName?: string, lastName?: string): string {
  const a = firstName?.trim()?.[0] ?? '';
  const b = lastName?.trim()?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || '?';
}

export const CompanyJobApplicationsPage: React.FC = () => {
  const { companyId, jobId } = useParams<{ companyId: string; jobId: string }>();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const companyBase = isAdminPath
    ? `/admin/companies/${companyId}`
    : `/company/${companyId}`;
  const jobsListPath = isAdminPath
    ? `/admin/jobs/${jobId}`
    : `/company/${companyId}/candidates`;
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  useMarkCandidateNotificationsSeen(isAdminPath ? undefined : companyId);

  const jobQuery = useQuery({
    queryKey: [isAdminPath ? 'admin' : 'employer', 'job', companyId, jobId],
    queryFn: () =>
      isAdminPath ? adminApi.getJob(jobId!) : employerApi.getJob(companyId!, jobId!),
    enabled: Boolean(companyId && jobId),
  });

  const statsQuery = useQuery({
    queryKey: ['employer', 'job-stats', companyId, jobId],
    queryFn: () => employerApi.getJobStats(companyId!, jobId!),
    enabled: Boolean(companyId && jobId) && !isAdminPath,
  });

  const appsQuery = useQuery({
    queryKey: ['employer', 'applications', companyId, jobId, status, search],
    queryFn: () =>
      employerApi.listApplications(companyId!, jobId!, {
        status: status || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(companyId && jobId),
  });

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0])) as Record<
      ApplicationStatus,
      number
    >;
    for (const row of statsQuery.data?.applications ?? []) {
      counts[row.status] = row._count;
    }
    return counts;
  }, [statsQuery.data]);

  const totalCount = useMemo(
    () => PIPELINE_STATUSES.reduce((sum, s) => sum + statusCounts[s], 0),
    [statusCounts],
  );

  if (!companyId || !jobId) {
    return <div className="pb-card alert-error">Missing company or job.</div>;
  }

  const apps = appsQuery.data ?? [];
  const job = jobQuery.data;
  const showCounts = !isAdminPath;
  const metaBits = [
    job?.category?.name,
    job?.location?.name,
    job?.employmentType?.replace(/_/g, ' '),
  ].filter(Boolean);

  return (
    <div className="emp-inbox-page">
      <header className="emp-inbox-header">
        <Link to={jobsListPath} className="emp-inbox-back">
          ← Review candidates
        </Link>
        <p className="emp-page-kicker">Company vacancy</p>
        <h1>{job?.title ?? 'Applications'}</h1>
        {metaBits.length > 0 && <p className="emp-inbox-meta">{metaBits.join(' · ')}</p>}
      </header>

      <section className="emp-inbox-panel">
        <div className="emp-inbox-status-strip" role="tablist" aria-label="Filter by status">
          <button
            type="button"
            role="tab"
            aria-selected={status === ''}
            className={`emp-inbox-status${status === '' ? ' is-active' : ''}`}
            onClick={() => setStatus('')}
          >
            <span className="emp-inbox-status-count">{showCounts ? totalCount : '·'}</span>
            <span className="emp-inbox-status-label">All</span>
          </button>
          {PIPELINE_STATUSES.map((value) => {
            const count = statusCounts[value];
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={status === value}
                className={`emp-inbox-status${status === value ? ' is-active' : ''}`}
                onClick={() => setStatus(value)}
              >
                <span className="emp-inbox-status-count">{showCounts ? count : '·'}</span>
                <span className="emp-inbox-status-label">{formatApplicationStatus(value)}</span>
              </button>
            );
          })}
        </div>

        <form
          className="emp-inbox-search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search candidates"
          />
          <button type="submit" className="btn btn-sm emp-inbox-search-btn">
            Search
          </button>
        </form>

        {appsQuery.isLoading && <div className="emp-inbox-state">Loading candidates…</div>}

        {appsQuery.isError && (
          <div className="emp-inbox-state is-error">{(appsQuery.error as Error).message}</div>
        )}

        {!appsQuery.isLoading && !appsQuery.isError && apps.length === 0 && (
          <div className="emp-inbox-empty">
            <h3>
              {status
                ? `No one in ${formatApplicationStatus(status)}`
                : search
                  ? 'No matches'
                  : 'No applications yet'}
            </h3>
            <p>
              {status || search
                ? 'Try another status or clear your search.'
                : 'Candidates who apply through Progress will show up here.'}
            </p>
          </div>
        )}

        {apps.length > 0 && (
          <ul className="emp-inbox-list">
            {apps.map((app) => {
              const first = app.candidate?.user?.firstName;
              const last = app.candidate?.user?.lastName;
              const name = [first, last].filter(Boolean).join(' ') || 'Candidate';
              return (
                <li key={app.id}>
                  <Link
                    to={`${companyBase}/applications/${app.id}`}
                    className="emp-inbox-row"
                  >
                    <span className="emp-inbox-avatar" aria-hidden="true">
                      {candidateInitials(first, last)}
                    </span>
                    <span className="emp-inbox-row-copy">
                      <strong>{name}</strong>
                      <span>
                        {app.candidate?.user?.email ?? '—'}
                        <span className="emp-inbox-dot">·</span>
                        <time dateTime={app.appliedAt}>
                          {new Date(app.appliedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </span>
                    </span>
                    <span className={applicationStatusPillClass(app.status, app.resubmittedAt)}>
                      {applicationStatusLabel(app.status, app.resubmittedAt)}
                    </span>
                    <span className="emp-inbox-row-cta">Review</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
