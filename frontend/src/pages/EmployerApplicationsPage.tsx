import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { apiDownloadFile } from '../api/client';
import type { ApplicationStatus } from '../types/api';

const ALLOWED_NEXT_STATUS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['reviewing', 'shortlisted', 'rejected'],
  reviewing: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'offered', 'rejected'],
  interview: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export const EmployerApplicationsPage: React.FC = () => {
  const { companyId, jobId } = useParams<{ companyId: string; jobId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ['employer', 'job-stats', companyId, jobId],
    queryFn: () => employerApi.getJobStats(companyId!, jobId!),
    enabled: Boolean(companyId && jobId),
  });

  const appsQuery = useQuery({
    queryKey: ['employer', 'applications', companyId, jobId, statusFilter, search],
    queryFn: () =>
      employerApi.listApplications(companyId!, jobId!, {
        status: statusFilter,
        search,
      }),
    enabled: Boolean(companyId && jobId),
  });

  const detailQuery = useQuery({
    queryKey: ['employer', 'application-detail', companyId, selectedAppId],
    queryFn: () => employerApi.getApplication(companyId!, selectedAppId!),
    enabled: Boolean(companyId && selectedAppId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) =>
      employerApi.updateApplicationStatus(companyId!, appId, { status }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ['employer', 'applications', companyId, jobId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['employer', 'job-stats', companyId, jobId],
      });
      if (selectedAppId) {
        void queryClient.invalidateQueries({
          queryKey: ['employer', 'application-detail', companyId, selectedAppId],
        });
      }
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const apps = appsQuery.data ?? [];

  return (
    <div className="stack">
      <div>
        <Link to={`/employer/${companyId}/jobs`} className="muted">
          ← Back to Company Jobs
        </Link>
      </div>

      <div className="page-header">
        <h1>Applicant Pipeline</h1>
        <p className="muted">
          Job ID: <code>{jobId}</code>
          {statsQuery.data && (
            <>
              {' '}
              • Total Views: <strong>{statsQuery.data.views}</strong>
            </>
          )}
        </p>
      </div>

      <div className="card filter-bar">
        <div className="grid-two">
          <div className="field">
            <label htmlFor="emp-status-filter">Filter by Status</label>
            <select
              id="emp-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
            >
              <option value="">All Statuses</option>
              <option value="submitted">submitted</option>
              <option value="reviewing">reviewing</option>
              <option value="shortlisted">shortlisted</option>
              <option value="interview">interview</option>
              <option value="offered">offered</option>
              <option value="hired">hired</option>
              <option value="rejected">rejected</option>
              <option value="withdrawn">withdrawn</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="emp-search">Search Applicant (name or email)</label>
            <input
              id="emp-search"
              type="text"
              placeholder="Search candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {actionError && <div className="card alert-error">{actionError}</div>}
      {appsQuery.isLoading && <div className="card">Loading applicants...</div>}
      {appsQuery.isError && (
        <div className="card alert-error">
          Failed to load applicants: {(appsQuery.error as Error).message}
        </div>
      )}

      {!appsQuery.isLoading && apps.length === 0 && (
        <div className="card">No applications match the current filters.</div>
      )}

      {apps.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Current Status</th>
                <th>Move Status To</th>
                <th>CV / Resume</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const nextOptions = ALLOWED_NEXT_STATUS[app.status] ?? [];
                return (
                  <tr key={app.id}>
                    <td>
                      <strong>
                        {app.candidate?.user.firstName} {app.candidate?.user.lastName}
                      </strong>
                    </td>
                    <td>{app.candidate?.user.email}</td>
                    <td>
                      <span className="badge badge-info">{app.status}</span>
                    </td>
                    <td>
                      {nextOptions.length === 0 ? (
                        <span className="muted">Terminal state</span>
                      ) : (
                        <select
                          value=""
                          disabled={statusMutation.isPending}
                          onChange={(e) => {
                            const next = e.target.value as ApplicationStatus;
                            if (next) {
                              statusMutation.mutate({ appId: app.id, status: next });
                            }
                          }}
                        >
                          <option value="">Move to...</option>
                          {nextOptions.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {app.resume?.file ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() =>
                            apiDownloadFile(
                              app.resume!.file!.id,
                              app.resume!.file!.originalName || 'resume.pdf',
                            ).catch((e: Error) => setActionError(e.message))
                          }
                        >
                          Download CV
                        </button>
                      ) : (
                        <span className="muted">No CV</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() =>
                          setSelectedAppId((prev) => (prev === app.id ? null : app.id))
                        }
                      >
                        {selectedAppId === app.id ? 'Hide' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedAppId && (
        <div className="card">
          <h3>Application Detail ({selectedAppId})</h3>
          {detailQuery.isLoading && <p>Loading application details...</p>}
          {detailQuery.data && (
            <div className="stack">
              <p>
                <strong>Candidate:</strong> {detailQuery.data.candidate?.user.firstName}{' '}
                {detailQuery.data.candidate?.user.lastName} ({detailQuery.data.candidate?.user.email}
                )
              </p>
              {detailQuery.data.coverLetter && (
                <div>
                  <strong>Cover Letter:</strong>
                  <div className="prose subcard">{detailQuery.data.coverLetter}</div>
                </div>
              )}
              <div>
                <strong>Screening Answers:</strong>
                {!detailQuery.data.answers || detailQuery.data.answers.length === 0 ? (
                  <p className="muted">No screening answers submitted.</p>
                ) : (
                  <ul>
                    {detailQuery.data.answers.map((ans) => (
                      <li key={ans.id}>
                        <strong>{ans.question?.questionText ?? ans.questionId}:</strong>{' '}
                        {ans.answerText}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
