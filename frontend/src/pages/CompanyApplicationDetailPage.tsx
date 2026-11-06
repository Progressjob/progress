import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { apiDownloadFile, apiOpenFile, apiPrintFile } from '../api/client';
import type { ApplicationStatus, InterviewType } from '../types/api';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { useMarkCandidateNotificationsSeen } from '../hooks/useMarkCandidateNotificationsSeen';
import {
  APPLICATION_TRANSITIONS,
  TERMINAL_APPLICATION_STATUSES,
  applicationStatusBadgeClassFor,
  applicationStatusLabel,
  formatApplicationStatus,
} from '../utils/applicationStatus';

function latestRejectionReason(
  events?: Array<{ newStatus: string; note?: string | null; createdAt: string }>,
): string | null {
  if (!events?.length) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.newStatus === 'rejected' && event.note?.trim()) {
      return event.note.trim();
    }
  }
  return null;
}

function formatFileSize(bytes?: number): string | null {
  if (bytes == null || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resumeFileLabel(resume: {
  title: string;
  file?: { originalFilename?: string; originalName?: string; mimeType?: string; sizeBytes?: number };
}): string {
  return (
    resume.file?.originalFilename ||
    resume.file?.originalName ||
    resume.title ||
    'CV'
  );
}

export const CompanyApplicationDetailPage: React.FC = () => {
  const { companyId, applicationId } = useParams<{
    companyId: string;
    applicationId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const companyBase = isAdmin
    ? `/admin/companies/${companyId}`
    : `/company/${companyId}`;
  const queryClient = useQueryClient();

  const [statusNote, setStatusNote] = useState('');
  const [message, setMessage] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('video');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState<'view' | 'print' | 'download' | null>(null);
  useMarkCandidateNotificationsSeen(isAdmin ? undefined : companyId);

  const detailQuery = useQuery({
    queryKey: ['employer', 'application', companyId, applicationId],
    queryFn: () => employerApi.getApplication(companyId!, applicationId!),
    enabled: Boolean(companyId && applicationId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['employer', 'application', companyId, applicationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['employer', 'applications', companyId],
    });
  };

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      employerApi.updateApplicationStatus(companyId!, applicationId!, {
        status,
        note: statusNote.trim() || undefined,
      }),
    onSuccess: (updated, status) => {
      setStatusNote('');
      setActionError(null);
      invalidate();
      if (status === 'rejected') {
        if (isAdmin && updated.jobId) {
          navigate(`${companyBase}/jobs/${updated.jobId}/applications`);
        } else {
          navigate(`${companyBase}/candidates`);
        }
      }
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const messageMutation = useMutation({
    mutationFn: () =>
      employerApi.sendApplicationMessage(companyId!, applicationId!, {
        body: message.trim(),
      }),
    onSuccess: () => {
      setMessage('');
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const interviewMutation = useMutation({
    mutationFn: () =>
      employerApi.createInterview(companyId!, applicationId!, {
        interviewType,
        scheduledAt: new Date(interviewAt).toISOString(),
        locationOrLink: interviewLink.trim() || undefined,
      }),
    onSuccess: () => {
      setInterviewAt('');
      setInterviewLink('');
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const app = detailQuery.data;
  const nextStatuses = useMemo(() => {
    if (!app) return [] as ApplicationStatus[];
    return APPLICATION_TRANSITIONS[app.status].filter((s) => s !== 'withdrawn');
  }, [app]);
  const terminal = app ? TERMINAL_APPLICATION_STATUSES.has(app.status) : false;
  const rejectionReason = latestRejectionReason(app?.events);
  const canReject = Boolean(statusNote.trim());

  if (!companyId || !applicationId) {
    return <div className="pb-card alert-error">Missing application context.</div>;
  }

  if (detailQuery.isLoading) {
    return <div className="pb-card">Loading application…</div>;
  }

  if (detailQuery.isError || !app) {
    return (
      <div className="pb-card alert-error">
        {(detailQuery.error as Error)?.message ?? 'Application not found'}
      </div>
    );
  }

  const name = [app.candidate?.user?.firstName, app.candidate?.user?.lastName]
    .filter(Boolean)
    .join(' ');
  const jobId = app.jobId;
  const resume = app.resume;
  const resumeFile = resume?.file;
  const resumeName = resume ? resumeFileLabel(resume) : null;
  const resumeSize = formatFileSize(resumeFile?.sizeBytes);
  const candidateSlug = name || 'candidate';

  const runResumeAction = async (action: 'view' | 'print' | 'download') => {
    if (!resumeFile) return;
    setResumeBusy(action);
    setActionError(null);
    try {
      if (action === 'view') await apiOpenFile(resumeFile.id);
      else if (action === 'print') await apiPrintFile(resumeFile.id);
      else {
        await apiDownloadFile(
          resumeFile.id,
          resumeName || `${candidateSlug.replace(/\s+/g, '-')}-CV`,
        );
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open the CV');
    } finally {
      setResumeBusy(null);
    }
  };

  return (
    <div className="cw-page-stack">
      <div className="pb-card">
        <p className="muted" style={{ margin: '0 0 0.35rem' }}>
          <Link to={`${companyBase}/jobs/${jobId}/applications`}>← Applications</Link>
        </p>
        <div className="apps-card-top" style={{ alignItems: 'flex-start' }}>
          <div className="apps-card-copy">
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>{name || 'Candidate'}</h1>
            <p style={{ margin: 0 }}>
              {app.candidate?.user?.email}
              {app.candidate?.user?.phone ? ` · ${app.candidate.user.phone}` : ''}
            </p>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {app.job?.title ?? 'Job'} · Applied{' '}
              {new Date(app.appliedAt).toLocaleString()}
            </p>
          </div>
          <div className="apps-card-side">
            <span className={applicationStatusBadgeClassFor(app.status, app.resubmittedAt)}>
              {applicationStatusLabel(app.status, app.resubmittedAt)}
            </span>
            <Link
              to={
                isAdmin
                  ? `/admin/cv-search/${app.candidateId}`
                  : `/company/${companyId}/cv-search/${app.candidateId}`
              }
              className="btn btn-sm"
            >
              View profile
            </Link>
          </div>
        </div>
      </div>

      {actionError && <div className="alert-error">{actionError}</div>}

      {app.status === 'rejected' && rejectionReason && (
        <div className="pb-card">
          <h3 className="pb-card-title">Rejection reason</h3>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{rejectionReason}</p>
        </div>
      )}

      {app.coverLetter && (
        <div className="pb-card">
          <h3 className="pb-card-title">Cover letter</h3>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{app.coverLetter}</p>
        </div>
      )}

      <div className="pb-card app-resume-card">
        <h3 className="pb-card-title">Resume / CV</h3>
        {resumeFile ? (
          <>
            <div className="app-resume-meta">
              <span className="app-resume-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="14 2 14 8 20 8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="app-resume-meta-copy">
                <strong>{resumeName}</strong>
                <span className="muted">
                  {[
                    resumeFile.mimeType?.includes('pdf')
                      ? 'PDF'
                      : resumeFile.mimeType?.includes('word')
                        ? 'Word'
                        : null,
                    resumeSize,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Attached to this application'}
                </span>
              </div>
            </div>
            <div className="app-resume-actions">
              <button
                type="button"
                className="btn btn-sm"
                disabled={resumeBusy !== null}
                onClick={() => void runResumeAction('view')}
              >
                {resumeBusy === 'view' ? 'Opening…' : 'View'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={resumeBusy !== null}
                title="Open print dialog for physical review"
                onClick={() => void runResumeAction('print')}
              >
                {resumeBusy === 'print' ? 'Preparing…' : 'Print'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={resumeBusy !== null}
                onClick={() => void runResumeAction('download')}
              >
                {resumeBusy === 'download' ? 'Downloading…' : 'Download'}
              </button>
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No resume was attached to this application.
          </p>
        )}
      </div>

      {app.answers && app.answers.length > 0 && (
        <div className="pb-card">
          <h3 className="pb-card-title">Screening answers</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {app.answers.map((answer) => (
              <li key={answer.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{answer.question?.questionText ?? 'Question'}</strong>
                <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{answer.answerText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div className="pb-card stack">
          <h3 className="pb-card-title">Update status</h3>
          <div className="profile-field-wrap">
            <label htmlFor="status-note">
              {nextStatuses.includes('rejected')
                ? 'Note / rejection reason'
                : 'Note (optional)'}
            </label>
            <textarea
              id="status-note"
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Required when rejecting — visible to the candidate"
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {nextStatuses.map((status) => {
              const isReject = status === 'rejected';
              const disabled =
                statusMutation.isPending || (isReject && !canReject);
              return (
                <button
                  key={status}
                  type="button"
                  className={`btn btn-sm ${isReject ? 'btn-danger' : ''}`}
                  disabled={disabled}
                  title={
                    isReject && !canReject
                      ? 'Enter a rejection reason first'
                      : undefined
                  }
                  onClick={() => statusMutation.mutate(status)}
                >
                  Mark {formatApplicationStatus(status)}
                </button>
              );
            })}
          </div>
          {nextStatuses.includes('rejected') && !canReject && (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              A rejection reason is required before marking rejected.
            </p>
          )}
        </div>
      )}

      {!terminal && (
        <>
          <div className="pb-card stack">
            <h3 className="pb-card-title">Schedule interview</h3>
            <div className="grid-two">
              <div className="profile-field-wrap">
                <label htmlFor="interview-type">Type</label>
                <select
                  id="interview-type"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                >
                  <option value="video">Video</option>
                  <option value="phone">Phone</option>
                  <option value="in_person">In person</option>
                </select>
              </div>
              <div className="profile-field-wrap">
                <label htmlFor="interview-at">When</label>
                <input
                  id="interview-at"
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(e) => setInterviewAt(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="profile-field-wrap">
              <label htmlFor="interview-link">Location or link</label>
              <input
                id="interview-link"
                value={interviewLink}
                onChange={(e) => setInterviewLink(e.target.value)}
                placeholder="Office address or meeting URL"
              />
            </div>
            <button
              type="button"
              className="btn btn-sm"
              disabled={interviewMutation.isPending || !interviewAt}
              onClick={() => interviewMutation.mutate()}
            >
              {interviewMutation.isPending ? 'Scheduling…' : 'Schedule interview'}
            </button>
          </div>

          <div className="pb-card stack">
            <h3 className="pb-card-title">Message candidate</h3>
            <div className="profile-field-wrap">
              <label htmlFor="app-message">Message</label>
              <textarea
                id="app-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send an update about this application…"
              />
            </div>
            <button
              type="button"
              className="btn btn-sm"
              disabled={messageMutation.isPending || !message.trim()}
              onClick={() => messageMutation.mutate()}
            >
              {messageMutation.isPending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </>
      )}

      {app.interviews && app.interviews.length > 0 && (
        <div className="pb-card">
          <h3 className="pb-card-title">Interviews</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {app.interviews.map((interview) => (
              <li key={interview.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{interview.interviewType.replace(/_/g, ' ')}</strong>
                {' · '}
                {new Date(interview.scheduledAt).toLocaleString()}
                {' · '}
                {interview.status}
                {interview.locationOrLink && (
                  <div className="muted">{interview.locationOrLink}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ApplicationTimeline
        events={app.events}
        messageTitle="Message"
        emptyText="No events yet."
      />
    </div>
  );
};
