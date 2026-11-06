import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { apiOpenFile } from '../api/client';
import type { ApplicationStatus, InterviewType } from '../types/api';
import {
  APPLICATION_TRANSITIONS,
  formatApplicationStatus,
} from '../utils/applicationStatus';

export const CompanyApplicationDetailPage: React.FC = () => {
  const { companyId, applicationId } = useParams<{
    companyId: string;
    applicationId: string;
  }>();
  const location = useLocation();
  const companyBase = location.pathname.startsWith('/admin')
    ? `/admin/companies/${companyId}`
    : `/company/${companyId}`;
  const queryClient = useQueryClient();

  const [statusNote, setStatusNote] = useState('');
  const [message, setMessage] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('video');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

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
    onSuccess: () => {
      setStatusNote('');
      setActionError(null);
      invalidate();
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
            <span className="badge badge-info">{formatApplicationStatus(app.status)}</span>
            <Link
              to={
                location.pathname.startsWith('/admin')
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

      {app.coverLetter && (
        <div className="pb-card">
          <h3 className="pb-card-title">Cover letter</h3>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{app.coverLetter}</p>
        </div>
      )}

      {app.resume?.file && (
        <div className="pb-card">
          <h3 className="pb-card-title">Resume</h3>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void apiOpenFile(app.resume!.file!.id)}
          >
            Open {app.resume.title || 'CV'}
          </button>
        </div>
      )}

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
            <label htmlFor="status-note">Note (optional)</label>
            <textarea
              id="status-note"
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Visible on the application timeline"
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {nextStatuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${status === 'rejected' ? 'btn-danger' : ''}`}
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(status)}
              >
                Mark {formatApplicationStatus(status)}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <div className="pb-card">
        <h3 className="pb-card-title">Timeline</h3>
        {!app.events?.length ? (
          <p className="muted" style={{ margin: 0 }}>
            No events yet.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {app.events.map((event) => {
              const isMessage =
                event.oldStatus === event.newStatus && Boolean(event.note?.trim());
              return (
                <li key={event.id} style={{ marginBottom: '0.75rem' }}>
                  <strong>
                    {isMessage ? 'Message' : formatApplicationStatus(event.newStatus)}
                  </strong>
                  <span className="muted" style={{ marginLeft: '0.5rem' }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                  {event.note && (
                    <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{event.note}</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
