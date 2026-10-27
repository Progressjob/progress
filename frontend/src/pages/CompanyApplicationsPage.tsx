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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  submitted: { bg: '#eff6ff', text: '#1e40af' },
  reviewing: { bg: '#fef3c7', text: '#b45309' },
  shortlisted: { bg: '#ede9fe', text: '#6d28d9' },
  interview: { bg: '#e0e7ff', text: '#4338ca' },
  offered: { bg: '#dcfce7', text: '#15803d' },
  hired: { bg: '#16a34a', text: '#ffffff' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
  withdrawn: { bg: '#f1f5f9', text: '#64748b' },
};

export const CompanyApplicationsPage: React.FC = () => {
  const { companyId, jobId } = useParams<{ companyId: string; jobId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ['company', 'job-stats', companyId, jobId],
    queryFn: () => employerApi.getJobStats(companyId!, jobId!),
    enabled: Boolean(companyId && jobId),
  });

  const appsQuery = useQuery({
    queryKey: ['company', 'applications', companyId, jobId, statusFilter, search],
    queryFn: () =>
      employerApi.listApplications(companyId!, jobId!, {
        status: statusFilter,
        search,
      }),
    enabled: Boolean(companyId && jobId),
  });

  const detailQuery = useQuery({
    queryKey: ['company', 'application-detail', companyId, selectedAppId],
    queryFn: () => employerApi.getApplication(companyId!, selectedAppId!),
    enabled: Boolean(companyId && selectedAppId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) =>
      employerApi.updateApplicationStatus(companyId!, appId, { status }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ['company', 'applications', companyId, jobId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['company', 'job-stats', companyId, jobId],
      });
      if (selectedAppId) {
        void queryClient.invalidateQueries({
          queryKey: ['company', 'application-detail', companyId, selectedAppId],
        });
      }
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const apps = appsQuery.data ?? [];

  return (
    <div className="jobs-list-container">
      <nav className="detail-breadcrumbs" style={{ marginBottom: '1.5rem' }}>
        <Link to={`/company/${companyId}/jobs`}>← Back to job postings</Link>
      </nav>

      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <span className="section-eyebrow">Employer</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
          Candidates who applied
        </h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          Review applications and update hiring status.
          {statsQuery.data && ` • Views: ${statsQuery.data.views}`}
        </p>
      </div>

      {actionError && <div className="alert-box-error">{actionError}</div>}

      <div className="jobs-filter-card" style={{ marginBottom: '2rem' }}>
        <div className="filter-grid-row">
          <div className="filter-input-wrap">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['', 'submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className="quick-tag-pill"
                  style={{
                    background: statusFilter === st ? 'var(--primary)' : '#ffffff',
                    color: statusFilter === st ? '#ffffff' : '#334155',
                    fontWeight: 600,
                  }}
                >
                  {st ? st.toUpperCase() : 'ALL'}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {appsQuery.isLoading && <div className="card">Loading applications...</div>}

      {!appsQuery.isLoading && apps.length === 0 && (
        <div className="empty-results-box">
          <h3>No candidates in this filter</h3>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {apps.map((app) => {
          const color = STATUS_COLORS[app.status] || { bg: '#f1f5f9', text: '#334155' };
          const nextStatuses = ALLOWED_NEXT_STATUS[app.status] || [];
          const isSelected = selectedAppId === app.id;

          return (
            <div key={app.id} className="premium-job-card" style={{ borderLeft: `5px solid ${color.text}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {app.candidate?.user?.firstName} {app.candidate?.user?.lastName}
                  </h3>
                  <div className="muted">{app.candidate?.user?.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="tag-pill" style={{ background: color.bg, color: color.text }}>
                    {app.status.toUpperCase()}
                  </span>
                  <button type="button" className="btn-clear-filters" onClick={() => setSelectedAppId(isSelected ? null : app.id)}>
                    {isSelected ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>

              {isSelected && detailQuery.data && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  {detailQuery.data.resume?.file && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() =>
                        apiDownloadFile(
                          `/files/${detailQuery.data?.resume?.file?.id}/download`,
                          detailQuery.data?.resume?.file?.originalName ?? 'cv.pdf',
                        )
                      }
                    >
                      Download CV
                    </button>
                  )}
                  {nextStatuses.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {nextStatuses.map((nextSt) => (
                        <button
                          key={nextSt}
                          type="button"
                          className="btn btn-sm"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ appId: app.id, status: nextSt })}
                        >
                          → {nextSt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
