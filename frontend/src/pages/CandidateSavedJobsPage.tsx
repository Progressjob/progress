import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { CompanyLogoMark } from '../components/CompanyLogoMark';
import { companyLabel, isJobClosed, jobDeadlineDays } from '../utils/jobListing';

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const CandidateSavedJobsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ['candidate', 'saved-jobs'],
    queryFn: () => candidateApi.listSavedJobs(),
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => candidateApi.unsaveJob(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'saved-jobs'] });
    },
  });

  if (savedQuery.isLoading) {
    return <div className="pb-card">Loading saved jobs…</div>;
  }

  if (savedQuery.isError) {
    return (
      <div className="pb-card alert-error">
        Failed to load saved jobs: {(savedQuery.error as Error).message}
      </div>
    );
  }

  const saved = savedQuery.data ?? [];

  if (saved.length === 0) {
    return (
      <div className="pb-card">
        <p className="pb-empty" style={{ margin: 0 }}>
          You have not saved any jobs yet.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/jobs" className="btn btn-sm">
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-page-stack">
      {unsaveMutation.isError && (
        <div className="alert-error">{(unsaveMutation.error as Error).message}</div>
      )}
      <div className="saved-jobs-grid">
        {saved.map((item) => {
          const job = item.job;
          if (!job) {
            return (
              <article key={item.jobId} className="jb-featured-card saved-job-card is-closed">
                <p className="saved-job-unavailable">This saved job is no longer available.</p>
                <div className="jb-featured-foot">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={unsaveMutation.isPending}
                    onClick={() => unsaveMutation.mutate(item.jobId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          }

          const closed = isJobClosed(job);
          const deadline = jobDeadlineDays(job.applicationDeadline);
          const href = `/jobs/${job.slug}`;

          return (
            <article
              key={item.jobId}
              className={`jb-featured-card saved-job-card${closed ? ' is-closed' : ''}`}
            >
              <div className="saved-job-top">
                <div className="saved-job-logo">
                  <CompanyLogoMark
                    name={job.company?.name}
                    logoId={job.company?.logo?.id ?? job.company?.logoFileId}
                    className="saved-job-logo-fallback"
                    imgClassName="saved-job-logo-img"
                  />
                </div>
                {closed && <span className="saved-job-closed-badge">Closed</span>}
              </div>
              <h3 className="jb-featured-title">
                {closed ? job.title : <Link to={href}>{job.title}</Link>}
              </h3>
              <p className="jb-featured-company">{companyLabel(job)}</p>
              <p className="saved-job-meta">
                {job.location?.name || 'Ethiopia'}
                <span aria-hidden="true"> · </span>
                {job.employmentType.replaceAll('_', ' ')}
              </p>
              <div className="jb-featured-foot">
                <div className={`jb-deadline${deadline.urgent || closed ? ' is-urgent' : ''}`}>
                  <span className="jb-deadline-label">Deadline</span>
                  <strong>{closed ? 'Closed' : deadline.label}</strong>
                </div>
                <div className="saved-job-actions">
                  {!closed && (
                    <Link to={href} className="jb-featured-go">
                      <span className="jb-sr-only">View {job.title}</span>
                      <ArrowIcon />
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={unsaveMutation.isPending}
                    onClick={() => unsaveMutation.mutate(job.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
