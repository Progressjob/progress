import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import type { Job } from '../types/api';

function isOpenJob(job: Job): boolean {
  if (job.status === 'closed' || job.status === 'archived' || job.status === 'rejected') return false;
  if (job.status !== 'published' && job.status !== 'pending_review') return false;
  if (!job.applicationDeadline) return true;
  const end = new Date(job.applicationDeadline);
  if (Number.isNaN(end.getTime())) return true;
  const deadlineEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return deadlineEnd.getTime() >= Date.now();
}

export const CompanyReviewCandidatesPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

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

  const companies = companiesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  const reviewJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((job) => job.status === 'published' || job.status === 'closed' || job.status === 'pending_review')
      .filter((job) => {
        if (!q) return true;
        return (
          job.title.toLowerCase().includes(q) ||
          (job.category?.name ?? '').toLowerCase().includes(q) ||
          (job.location?.name ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aOpen = isOpenJob(a) ? 1 : 0;
        const bOpen = isOpenJob(b) ? 1 : 0;
        if (aOpen !== bOpen) return bOpen - aOpen;
        return (b._count?.applications ?? 0) - (a._count?.applications ?? 0);
      });
  }, [jobs, search]);

  const totalApplicants = jobs.reduce((sum, job) => sum + (job._count?.applications ?? 0), 0);

  if (!companyId) {
    return <div className="pb-card alert-error">Missing company.</div>;
  }

  return (
    <div className="emp-review-page">
      <header className="emp-page-header">
        <div className="emp-page-header-copy">
          <p className="emp-page-kicker">{companyQuery.data?.name ?? 'Company'}</p>
          <h1>Review candidates</h1>
          <p>
            Choose a vacancy to see who applied through Progress, update status, and message
            candidates.
          </p>
        </div>
        <div className="emp-page-header-actions">
          {companies.length > 1 && (
            <select
              value={companyId}
              onChange={(e) => navigate(`/company/${e.target.value}/candidates`)}
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
          <Link to={`/company/${companyId}/jobs`} className="btn btn-secondary">
            Manage jobs
          </Link>
        </div>
      </header>

      <section className="emp-summary-strip" aria-label="Candidate review summary">
        <div>
          <span>{reviewJobs.length}</span>
          <small>Vacancies</small>
        </div>
        <div>
          <span>{totalApplicants}</span>
          <small>Applications</small>
        </div>
        <div>
          <span>{reviewJobs.filter((j) => (j._count?.applications ?? 0) > 0).length}</span>
          <small>With applicants</small>
        </div>
      </section>

      <div className="emp-review-panel">
        <div className="emp-review-toolbar">
          <input
            type="search"
            className="emp-review-search"
            placeholder="Search vacancies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search vacancies"
          />
        </div>

        {jobsQuery.isLoading && <div className="pb-card">Loading vacancies…</div>}

        {jobsQuery.isError && (
          <div className="pb-card alert-error">{(jobsQuery.error as Error).message}</div>
        )}

        {!jobsQuery.isLoading && reviewJobs.length === 0 && (
          <div className="emp-review-empty">
            <h3>No vacancies to review yet</h3>
            <p>Once jobs are posted and candidates apply, they will appear here.</p>
            <Link to={`/company/${companyId}/jobs/new`} className="btn btn-sm">
              Post a job
            </Link>
          </div>
        )}

        {reviewJobs.length > 0 && (
          <div className="emp-review-list">
            {reviewJobs.map((job) => {
              const apps = job._count?.applications ?? 0;
              const open = isOpenJob(job);
              return (
                <article key={job.id} className="emp-review-card">
                  <div className="emp-review-card-main">
                    <div className="emp-review-card-copy">
                      <div className="emp-review-card-tags">
                        <span className={`emp-review-pill${open ? ' is-live' : ''}`}>
                          {open ? 'Open' : job.status.replace(/_/g, ' ')}
                        </span>
                        <span className="emp-review-apps">{apps} applicant{apps === 1 ? '' : 's'}</span>
                      </div>
                      <h2>{job.title}</h2>
                      <p>
                        {[job.category?.name, job.location?.name, job.employmentType?.replace(/_/g, ' ')]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Link
                      to={`/company/${companyId}/jobs/${job.id}/applications`}
                      className="btn emp-review-cta"
                    >
                      {apps > 0 ? 'Review applicants' : 'Open inbox'}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
