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
    <div className="jobs-list-container">
      {/* Breadcrumb */}
      <nav className="detail-breadcrumbs" style={{ marginBottom: '1.5rem' }}>
        <Link to={`/employer/${companyId}/jobs`}>← Back to Company Jobs</Link>
      </nav>

      {/* Header */}
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <span className="section-eyebrow">Talent Review</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>Candidate Pipeline & Applications</h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          Evaluate submitted CVs, review screening questionnaire answers, and progress candidates through the hiring stages.
          {statsQuery.data && ` • Total Impressions: ${statsQuery.data.views}`}
        </p>
      </div>

      {actionError && <div className="alert-box-error">{actionError}</div>}

      {/* Filter and Search Bar */}
      <div className="jobs-filter-card" style={{ marginBottom: '2rem' }}>
        <div className="filter-grid-row">
          <div className="filter-input-wrap">
            <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search candidate by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['', 'submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const).map(
              (st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className="quick-tag-pill"
                    style={{
                      background: isActive ? 'var(--primary)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      fontWeight: 600,
                    }}
                  >
                    {st ? st.toUpperCase() : 'ALL STAGES'}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {appsQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {!appsQuery.isLoading && apps.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">👥</div>
          <h3>No Candidates in this Stage</h3>
          <p>No candidates match the selected filter criteria for this vacancy.</p>
        </div>
      )}

      {/* Candidate List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {apps.map((app) => {
          const color = STATUS_COLORS[app.status] || { bg: '#f1f5f9', text: '#334155' };
          const nextStatuses = ALLOWED_NEXT_STATUS[app.status] || [];
          const isSelected = selectedAppId === app.id;

          return (
            <div
              key={app.id}
              className="premium-job-card"
              style={{
                borderLeft: `5px solid ${color.text}`,
                padding: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="company-badge" style={{ background: color.text, width: '44px', height: '44px', fontSize: '1.1rem' }}>
                    {app.candidate?.user?.firstName?.charAt(0) ?? 'C'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0a2540', fontWeight: 800 }}>
                      {app.candidate?.user?.firstName} {app.candidate?.user?.lastName}
                    </h3>
                    <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '2px' }}>
                      {app.candidate?.user?.email ?? 'No email'}{' '}
                      {app.candidate?.user?.phone ? `• ${app.candidate.user.phone}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    className="tag-pill"
                    style={{ background: color.bg, color: color.text, fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    ● {app.status.toUpperCase()}
                  </span>

                  <button
                    type="button"
                    className="btn-clear-filters"
                    onClick={() => setSelectedAppId(isSelected ? null : app.id)}
                  >
                    {isSelected ? 'Hide Details ▲' : 'View Full Application ▼'}
                  </button>
                </div>
              </div>

              {/* Application Details Drawer */}
              {isSelected && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                  {detailQuery.isLoading && <p>Loading candidate credentials...</p>}
                  {detailQuery.data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Attached CV */}
                      {detailQuery.data.resume?.file && (
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0a2540' }}>Attached Candidate CV:</strong>
                          <div style={{ marginTop: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-card-apply"
                              style={{ cursor: 'pointer', border: 'none' }}
                              onClick={() =>
                                apiDownloadFile(
                                  `/files/${detailQuery.data?.resume?.file?.id}/download`,
                                  detailQuery.data?.resume?.file?.originalName ?? 'candidate-cv.pdf'
                                )
                              }
                            >
                              📥 Download {detailQuery.data.resume.file.originalName}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cover Letter */}
                      {detailQuery.data.coverLetter && (
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0a2540' }}>Candidate Statement / Cover Letter:</strong>
                          <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', fontSize: '0.92rem', color: '#334155', marginTop: '0.4rem', lineHeight: 1.6 }}>
                            {detailQuery.data.coverLetter}
                          </p>
                        </div>
                      )}

                      {/* Screening Answers */}
                      {detailQuery.data.answers && detailQuery.data.answers.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0a2540' }}>Screening Questionnaire Responses:</strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                            {detailQuery.data.answers.map((sa) => (
                              <div key={sa.id} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 650, color: '#475569' }}>
                                  Q: {sa.question?.questionText ?? 'Question'}
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                                  A: {sa.answerText}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Transition Action Buttons */}
                      {nextStatuses.length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0a2540', marginRight: '0.75rem' }}>
                            Advance Candidate Stage:
                          </span>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {nextStatuses.map((nextSt) => (
                              <button
                                key={nextSt}
                                type="button"
                                className="btn-card-apply"
                                style={{
                                  background: nextSt === 'rejected' ? '#fee2e2' : 'var(--primary)',
                                  color: nextSt === 'rejected' ? '#dc2626' : '#ffffff',
                                  cursor: 'pointer',
                                  border: 'none',
                                }}
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({ appId: app.id, status: nextSt })
                                }
                              >
                                Move to {nextSt.toUpperCase()} →
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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
