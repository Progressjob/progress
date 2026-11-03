import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { useAuth } from '../auth/AuthContext';
import { CandidateApplicationsBlockedNotice } from '../components/CandidateApplicationsBlockedNotice';
import { JobDetailContent } from '../components/jobs/JobDetailContent';

export const JobDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const applicationsBlocked = Boolean(user?.applicationsBlocked);

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.detail(slug!, 'job_detail_page'),
    enabled: Boolean(slug) && !authLoading && !applicationsBlocked,
  });

  const featuredQuery = useQuery({
    queryKey: ['jobs', 'detail-featured'],
    queryFn: () => jobsApi.list({ page: 1, limit: 6 }),
  });

  const job = jobQuery.data;

  if (authLoading) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="job-card-skeleton" style={{ minHeight: '340px' }} />
        </div>
      </div>
    );
  }

  if (applicationsBlocked) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <CandidateApplicationsBlockedNotice />
        </div>
      </div>
    );
  }

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
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="alert-box-error">
            <h2>Job Opportunity Not Found</h2>
            <p>{(jobQuery.error as Error)?.message || 'This position may have closed or expired.'}</p>
            <Link
              to="/jobs"
              className="btn-nav-register"
              style={{ display: 'inline-flex', marginTop: '1rem' }}
            >
              Back to Active Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="card stack guest-job-gate">
            <h1>{job.title.trim()}</h1>
            <p className="muted">
              Sign in to view the full vacancy, how to apply, and save this role.
            </p>
            <div className="guest-job-gate-actions">
              <Link to="/login" state={{ from: `/jobs/${slug}` }} className="btn">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Create account
              </Link>
            </div>
            <Link to="/jobs" className="muted">
              ← Back to jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <JobDetailContent
      job={job}
      featuredJobs={featuredQuery.data?.data ?? []}
      backFallback="/jobs"
    />
  );
};
