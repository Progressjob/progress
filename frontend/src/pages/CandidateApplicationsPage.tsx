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
    return <div className="card">Loading your applications...</div>;
  }

  if (appsQuery.isError) {
    return (
      <div className="card alert-error">
        Failed to load applications: {(appsQuery.error as Error).message}
      </div>
    );
  }

  const apps = appsQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>My Job Applications</h1>
        <p className="muted">Track your submitted applications and status updates.</p>
      </div>

      {withdrawMutation.isError && (
        <div className="alert-error">{(withdrawMutation.error as Error).message}</div>
      )}

      {apps.length === 0 ? (
        <div className="card">
          <p>You have not applied to any jobs yet.</p>
          <Link to="/jobs" className="btn btn-sm">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td>
                    {app.job?.slug ? (
                      <Link to={`/jobs/${app.job.slug}`}>
                        <strong>{app.job.title}</strong>
                      </Link>
                    ) : (
                      <strong>{app.job?.title ?? app.jobId}</strong>
                    )}
                  </td>
                  <td>{app.job?.company?.name ?? '—'}</td>
                  <td>
                    <span className="badge badge-info">{app.status}</span>
                  </td>
                  <td>{new Date(app.appliedAt).toLocaleString()}</td>
                  <td>
                    {!TERMINAL_STATES.has(app.status) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={withdrawMutation.isPending}
                        onClick={() => withdrawMutation.mutate(app.id)}
                      >
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
