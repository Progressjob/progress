import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { apiDownloadFile, apiOpenFile, apiPrintFile } from '../api/client';
import type { ApplicationStatus, InterviewType } from '../types/api';
import { ApplicationMessages } from '../components/ApplicationMessages';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { useAuth } from '../auth/AuthContext';
import { useMarkCandidateNotificationsSeen } from '../hooks/useMarkCandidateNotificationsSeen';
import {
  APPLICATION_TRANSITIONS,
  TERMINAL_APPLICATION_STATUSES,
  applicationStatusBadgeClassFor,
  applicationStatusLabel,
  formatApplicationStatus,
  getNextAdvanceStatus,
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

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatInterviewType(type: InterviewType): string {
  return type.replace(/_/g, ' ');
}

export const CompanyApplicationDetailPage: React.FC = () => {
  const { companyId, applicationId } = useParams<{
    companyId: string;
    applicationId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = location.pathname.startsWith('/admin');
  const companyBase = isAdmin
    ? `/admin/companies/${companyId}`
    : `/company/${companyId}`;
  const queryClient = useQueryClient();

  const [interviewType, setInterviewType] = useState<InterviewType>('video');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState<'view' | 'print' | 'download' | null>(null);
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [confirmAdvanceStatus, setConfirmAdvanceStatus] = useState<ApplicationStatus | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  useMarkCandidateNotificationsSeen(isAdmin ? undefined : companyId);

  useEffect(() => {
    if (!schedulingInterview && !editingSchedule) return;
    document.getElementById('schedule-interview')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [schedulingInterview, editingSchedule]);

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
    mutationFn: (payload: { status: ApplicationStatus; note?: string }) =>
      employerApi.updateApplicationStatus(companyId!, applicationId!, payload),
    onSuccess: (updated, { status }) => {
      setConfirmAdvanceStatus(null);
      setRejectModalOpen(false);
      setRejectReason('');
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
    mutationFn: (body: string) =>
      employerApi.sendApplicationMessage(companyId!, applicationId!, { body }),
    onSuccess: () => {
      setNoteModalOpen(false);
      setNoteBody('');
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const modalBusy = statusMutation.isPending || messageMutation.isPending;

  useEffect(() => {
    const open =
      confirmAdvanceStatus !== null || rejectModalOpen || noteModalOpen;
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || modalBusy) return;
      setConfirmAdvanceStatus(null);
      setRejectModalOpen(false);
      setNoteModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmAdvanceStatus, rejectModalOpen, noteModalOpen, modalBusy]);

  const interviewMutation = useMutation({
    mutationFn: (editingId?: string) => {
      const payload = {
        interviewType,
        scheduledAt: new Date(interviewAt).toISOString(),
        locationOrLink: interviewLink.trim() || undefined,
      };
      if (editingId) {
        return employerApi.updateInterview(companyId!, editingId, payload);
      }
      return employerApi.createInterview(companyId!, applicationId!, payload);
    },
    onSuccess: () => {
      setInterviewAt('');
      setInterviewLink('');
      setInterviewType('video');
      setSchedulingInterview(false);
      setEditingSchedule(false);
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
  const canEnterInterview = Boolean(
    app && APPLICATION_TRANSITIONS[app.status].includes('interview'),
  );
  const latestInterview = useMemo(() => {
    if (!app?.interviews?.length) return null;
    return [...app.interviews].sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )[0];
  }, [app]);
  const hasConfirmedSchedule = Boolean(
    app?.status === 'interview' && latestInterview,
  );
  /** Schedule UI only after employer chooses Mark interview, or when already in interview. */
  const showSchedulePanel = Boolean(
    app && (schedulingInterview || app.status === 'interview'),
  );
  const showScheduleForm = Boolean(
    showSchedulePanel &&
      (schedulingInterview || editingSchedule || !hasConfirmedSchedule),
  );
  const terminal = app ? TERMINAL_APPLICATION_STATUSES.has(app.status) : false;
  const rejectionReason = latestRejectionReason(app?.events);
  const advanceStatus = useMemo(
    () => getNextAdvanceStatus(nextStatuses),
    [nextStatuses],
  );
  const canMarkRejected = nextStatuses.includes('rejected');
  const canSendNote = Boolean(app && app.status !== 'hired' && app.status !== 'withdrawn');
  const canSubmitInterview = Boolean(interviewAt.trim()) && Boolean(interviewType);
  const rejectReasonReady = Boolean(rejectReason.trim());
  const noteReady = Boolean(noteBody.trim());

  const beginEditSchedule = () => {
    if (!latestInterview) return;
    setInterviewType(latestInterview.interviewType);
    setInterviewAt(toDatetimeLocalValue(latestInterview.scheduledAt));
    setInterviewLink(latestInterview.locationOrLink ?? '');
    setEditingSchedule(true);
    setSchedulingInterview(false);
    setActionError(null);
  };

  const cancelScheduleForm = () => {
    setSchedulingInterview(false);
    setEditingSchedule(false);
    setInterviewAt('');
    setInterviewLink('');
    setInterviewType('video');
    setActionError(null);
  };

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

      {(advanceStatus || canMarkRejected) && (
        <div className="pb-card stack">
          <h3 className="pb-card-title">Update status</h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            {advanceStatus && (
              <button
                type="button"
                className={`btn btn-sm ${
                  advanceStatus === 'interview' && schedulingInterview
                    ? 'btn-secondary'
                    : ''
                }`}
                disabled={statusMutation.isPending || interviewMutation.isPending}
                title={
                  advanceStatus === 'interview'
                    ? 'Fill the interview schedule to continue'
                    : undefined
                }
                onClick={() => {
                  if (advanceStatus === 'interview') {
                    setEditingSchedule(false);
                    setSchedulingInterview(true);
                    setActionError(null);
                    return;
                  }
                  setSchedulingInterview(false);
                  setEditingSchedule(false);
                  setConfirmAdvanceStatus(advanceStatus);
                }}
              >
                Mark {formatApplicationStatus(advanceStatus)}
              </button>
            )}
            {canMarkRejected && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={statusMutation.isPending || interviewMutation.isPending}
                onClick={() => {
                  setRejectReason('');
                  setRejectModalOpen(true);
                }}
              >
                Mark rejected
              </button>
            )}
            {canSendNote && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={messageMutation.isPending}
                aria-label="Send a note to the candidate"
                onClick={() => {
                  setNoteBody('');
                  setNoteModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
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
                  <line
                    x1="8"
                    y1="13"
                    x2="16"
                    y2="13"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="17"
                    x2="13"
                    y2="17"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Note
              </button>
            )}
          </div>
          {schedulingInterview && canEnterInterview && (
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
              Fill the interview schedule below. The candidate will be notified with
              the time and location/link.
            </p>
          )}
        </div>
      )}

      {!terminal && showSchedulePanel && (
        <div className="pb-card stack" id="schedule-interview">
          {hasConfirmedSchedule && !showScheduleForm ? (
            <>
              <h3 className="pb-card-title">Interview confirmed</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                The candidate has been notified. Next step is to mark offered when
                ready.
              </p>
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <div>
                  <strong>{formatInterviewType(latestInterview!.interviewType)}</strong>
                  {' · '}
                  {new Date(latestInterview!.scheduledAt).toLocaleString()}
                </div>
                {latestInterview!.locationOrLink && (
                  <div className="muted">{latestInterview!.locationOrLink}</div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={interviewMutation.isPending}
                  onClick={beginEditSchedule}
                >
                  Edit schedule
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="pb-card-title">
                {editingSchedule
                  ? 'Edit interview schedule'
                  : canEnterInterview
                    ? 'Interview schedule required'
                    : 'Schedule another interview'}
              </h3>
              {canEnterInterview && !editingSchedule && (
                <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                  Type and date/time are required to move this application to interview.
                  The candidate gets a schedule notice automatically.
                </p>
              )}
              <div className="grid-two">
                <div className="profile-field-wrap">
                  <label htmlFor="interview-type">
                    Type <span className="profile-field-req">*</span>
                  </label>
                  <select
                    id="interview-type"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                    required
                  >
                    <option value="video">Video</option>
                    <option value="phone">Phone</option>
                    <option value="in_person">In person</option>
                  </select>
                </div>
                <div className="profile-field-wrap">
                  <label htmlFor="interview-at">
                    When <span className="profile-field-req">*</span>
                  </label>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={interviewMutation.isPending || !canSubmitInterview}
                  title={
                    !canSubmitInterview
                      ? 'Choose interview type and date/time first'
                      : undefined
                  }
                  onClick={() =>
                    interviewMutation.mutate(
                      editingSchedule ? latestInterview?.id : undefined,
                    )
                  }
                >
                  {interviewMutation.isPending
                    ? editingSchedule
                      ? 'Saving…'
                      : 'Scheduling…'
                    : editingSchedule
                      ? 'Save schedule'
                      : canEnterInterview
                        ? 'Confirm schedule & set interview'
                        : 'Schedule interview'}
                </button>
                {(schedulingInterview || editingSchedule) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={interviewMutation.isPending}
                    onClick={cancelScheduleForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {user?.id && (
        <ApplicationMessages
          events={app.events}
          viewerUserId={user.id}
          counterpartUserId={app.candidate?.userId}
          counterpartLabel={name || 'Candidate'}
          canSend={app.status !== 'hired' && app.status !== 'withdrawn'}
          sending={messageMutation.isPending}
          placeholder="Send a message about this application…"
          onSend={async (body) => {
            await messageMutation.mutateAsync(body);
          }}
        />
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

      <ApplicationTimeline events={app.events} emptyText="No events yet." />

      {confirmAdvanceStatus && (
        <div
          className="emp-modal-overlay"
          onClick={() => !modalBusy && setConfirmAdvanceStatus(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-advance-title"
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="confirm-advance-title" className="emp-modal-title">
                  Update status
                </h3>
                <p className="emp-modal-subtitle">
                  Mark this application as{' '}
                  {formatApplicationStatus(confirmAdvanceStatus)}?
                </p>
              </div>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setConfirmAdvanceStatus(null)}
                disabled={modalBusy}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={modalBusy}
                onClick={() => setConfirmAdvanceStatus(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={modalBusy}
                onClick={() =>
                  statusMutation.mutate({ status: confirmAdvanceStatus })
                }
              >
                {statusMutation.isPending ? 'Updating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div
          className="emp-modal-overlay"
          onClick={() => !modalBusy && setRejectModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-reason-title"
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="reject-reason-title" className="emp-modal-title">
                  Reject candidate
                </h3>
                <p className="emp-modal-subtitle">
                  A rejection reason is required and will be visible to the candidate.
                </p>
              </div>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setRejectModalOpen(false)}
                disabled={modalBusy}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="emp-modal-body">
              <div className="profile-field-wrap">
                <label htmlFor="reject-reason">
                  Rejection reason <span className="profile-field-req">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this candidate is being rejected"
                  autoFocus
                />
              </div>
            </div>
            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={modalBusy}
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={modalBusy || !rejectReasonReady}
                title={
                  !rejectReasonReady
                    ? 'Enter a rejection reason first'
                    : undefined
                }
                onClick={() =>
                  statusMutation.mutate({
                    status: 'rejected',
                    note: rejectReason.trim(),
                  })
                }
              >
                {statusMutation.isPending ? 'Rejecting…' : 'Reject candidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {noteModalOpen && (
        <div
          className="emp-modal-overlay"
          onClick={() => !modalBusy && setNoteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-note-title"
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="send-note-title" className="emp-modal-title">
                  Send note
                </h3>
                <p className="emp-modal-subtitle">
                  Message the candidate about this application.
                </p>
              </div>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setNoteModalOpen(false)}
                disabled={modalBusy}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="emp-modal-body">
              <div className="profile-field-wrap">
                <label htmlFor="send-note-body">Note</label>
                <textarea
                  id="send-note-body"
                  rows={4}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write a short note for the candidate"
                  autoFocus
                />
              </div>
            </div>
            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={modalBusy}
                onClick={() => setNoteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={modalBusy || !noteReady}
                onClick={() => messageMutation.mutate(noteBody.trim())}
              >
                {messageMutation.isPending ? 'Sending…' : 'Send note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
