import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { CompanyLogoMark } from '../components/CompanyLogoMark';

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
      <div className="jobs-board-grid">
        {saved.map((item) => {
          const job = item.job;
          if (!job) {
            return (
              <article key={item.jobId} className="premium-job-card">
                <p>This saved job is no longer available.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => unsaveMutation.mutate(item.jobId)}
                >
                  Remove
                </button>
              </article>
            );
          }
          return (
            <article key={item.jobId} className="premium-job-card">
              <div className="job-card-header">
                <div className="company-badge">
                  <CompanyLogoMark
                    name={job.company?.name}
                    logoId={job.company?.logo?.id ?? job.company?.logoFileId}
                    imgClassName="company-logo-img"
                  />
                </div>
                <div className="job-card-meta">
                  <span className="job-company-name">{job.company?.name ?? 'Progress Partner'}</span>
                  <h2 className="job-card-title">
                    <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                  </h2>
                </div>
              </div>
              <div className="job-card-tags">
                {job.location && <span className="tag-pill tag-location">{job.location.name}</span>}
                <span className="tag-pill tag-type">{job.employmentType.replaceAll('_', ' ')}</span>
              </div>
              <div className="job-card-footer">
                <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                  View position
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={unsaveMutation.isPending}
                  onClick={() => unsaveMutation.mutate(job.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
