import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';

const TERMINAL_STATES = new Set(['hired', 'rejected', 'withdrawn']);

export const CandidateApplicationsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const appsQuery = useQuery({
    queryKey: ['candidate', 'applications'],
    queryFn: () => candidateApi.listApplications(),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => candidateApi.withdrawApplication(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'applications'] });
    },
  });

  if (appsQuery.isLoading) {
    return <div className="pb-card">Loading your applications…</div>;
  }

  if (appsQuery.isError) {
    return (
      <div className="pb-card alert-error">
        Failed to load applications: {(appsQuery.error as Error).message}
      </div>
    );
  }

  const apps = appsQuery.data ?? [];

  if (apps.length === 0) {
    return (
      <div className="pb-card">
        <p className="pb-empty" style={{ margin: 0 }}>
          You have not applied to any jobs yet.
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
      {withdrawMutation.isError && (
        <div className="alert-error">{(withdrawMutation.error as Error).message}</div>
      )}
      <div className="apps-card-list">
        {apps.map((app) => (
          <article key={app.id} className="apps-card">
            <div className="apps-card-top">
              <div className="apps-card-copy">
                <h3>
                  {app.job?.slug ? (
                    <Link to={`/jobs/${app.job.slug}`}>{app.job.title}</Link>
                  ) : (
                    app.job?.title ?? app.jobId
                  )}
                </h3>
                <p>
                  <span>{app.job?.company?.name ?? '—'}</span>
                  <span className="apps-card-sep" aria-hidden="true">
                    ·
                  </span>
                  <time dateTime={app.appliedAt}>
                    {new Date(app.appliedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </p>
              </div>
              <div className="apps-card-side">
                <span className="badge badge-info">{app.status.replace(/_/g, ' ')}</span>
                {!TERMINAL_STATES.has(app.status) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger apps-withdraw"
                    disabled={withdrawMutation.isPending}
                    onClick={() => withdrawMutation.mutate(app.id)}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
