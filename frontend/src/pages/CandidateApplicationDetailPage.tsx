import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { useAuth } from '../auth/AuthContext';
import { ApplicationMessages } from '../components/ApplicationMessages';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { CompanyLogoMark } from '../components/CompanyLogoMark';
import {
  TERMINAL_APPLICATION_STATUSES,
  applicationStatusBadgeClassFor,
  applicationStatusLabel,
  canReapplyExistingApplication,
} from '../utils/applicationStatus';

function prettyEnum(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function latestRejectionReason(
  events?: Array<{ newStatus: string; note?: string | null }>,
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

function shortWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZoneName: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const CandidateApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['candidate', 'applications', id],
    queryFn: () => candidateApi.getApplication(id!),
    enabled: Boolean(id),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => candidateApi.withdrawApplication(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'applications'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'applications', id] });
    },
  });

  if (detailQuery.isLoading) {
    return <div className="pb-card">Loading application…</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="pb-card alert-error">
        {(detailQuery.error as Error)?.message ?? 'Application not found'}
      </div>
    );
  }

  const app = detailQuery.data;
  const terminal = TERMINAL_APPLICATION_STATUSES.has(app.status);
  const company = app.job?.company?.name ?? 'Company';
  const title = app.job?.title ?? 'Vacancy';
  const location = app.job?.location?.name;
  const employment = prettyEnum(app.job?.employmentType);
  const workplace = prettyEnum(app.job?.workplaceType);
  const category = app.job?.category?.name;
  const vacancyMeta = [location, employment, workplace, category].filter(Boolean);
  const logoId = app.job?.company?.logo?.id ?? app.job?.company?.logoFileId ?? null;
  const rejectionReason = latestRejectionReason(app.events);
  const canReapply =
    Boolean(app.job?.slug) &&
    app.job?.status === 'published' &&
    canReapplyExistingApplication(app, app.job);
  const reapplyHref = canReapply ? `/jobs/${app.job!.slug}/apply` : null;

  return (
    <div className="cw-page-stack app-detail-compact">
      <p className="muted" style={{ margin: 0 }}>
        <Link to="/candidate/applications">← All applications</Link>
      </p>

      <div className="pb-card apps-vacancy-card">
        <div className="apps-card-main">
          <div className="apps-card-logo apps-card-logo--lg">
            <CompanyLogoMark
              name={company}
              logoId={logoId}
              className="apps-logo-fallback"
              imgClassName="apps-logo-img"
            />
          </div>
          <div className="apps-card-body">
            <div className="apps-card-top">
              <div className="apps-card-copy">
                <p className="apps-vacancy-label">Company vacancy</p>
                <p className="apps-company-name">{company}</p>
                <h2 className="apps-vacancy-title">{title}</h2>
                {vacancyMeta.length > 0 && (
                  <p className="apps-vacancy-meta">
                    {vacancyMeta.map((part, index) => (
                      <React.Fragment key={`vacancy-meta-${index}`}>
                        {index > 0 && (
                          <span className="apps-card-sep" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>
              <div className="apps-card-side apps-card-side--detail">
                {app.job?.slug && (
                  <Link to={`/jobs/${app.job.slug}`} className="btn btn-sm btn-secondary">
                    View vacancy
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-card app-status-panel">
        <div className="app-status-row">
          <div>
            <p className="apps-vacancy-label">Your application</p>
            <p className="app-status-applied">
              Applied{' '}
              {new Date(app.appliedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="app-status-actions">
            <span className={applicationStatusBadgeClassFor(app.status, app.resubmittedAt)}>
              {applicationStatusLabel(app.status, app.resubmittedAt)}
            </span>
            {reapplyHref && (
              <Link to={reapplyHref} className="btn btn-sm app-reapply-btn">
                Reapply again
              </Link>
            )}
            {!terminal && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={withdrawMutation.isPending}
                onClick={() => {
                  if (window.confirm('Withdraw this application?')) {
                    withdrawMutation.mutate();
                  }
                }}
              >
                Withdraw
              </button>
            )}
          </div>
        </div>

        {app.status === 'rejected' && (
          <div className="app-reject-strip">
            {rejectionReason ? (
              <p>
                <strong>Reason:</strong> {rejectionReason}
              </p>
            ) : (
              <p className="muted">The employer rejected this application.</p>
            )}
            <p className="muted app-reject-hint">
              Update your CV or profile, then reapply if the vacancy is still open.
              {reapplyHref && (
                <>
                  {' '}
                  <Link to={reapplyHref}>Reapply again →</Link>
                </>
              )}
            </p>
            <div className="app-reject-actions">
              <Link to="/candidate/profile?edit=1" className="btn btn-sm btn-secondary">
                Update profile
              </Link>
              {reapplyHref && (
                <Link to={reapplyHref} className="btn btn-sm app-reapply-btn">
                  Reapply again
                </Link>
              )}
            </div>
          </div>
        )}

        {withdrawMutation.isError && (
          <div className="alert-error" style={{ marginTop: '0.65rem' }}>
            {(withdrawMutation.error as Error).message}
          </div>
        )}
      </div>

      {app.coverLetter && (
        <div className="pb-card">
          <h3 className="pb-card-title">Cover letter</h3>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{app.coverLetter}</p>
        </div>
      )}

      {app.answers && app.answers.length > 0 && (
        <div className="pb-card">
          <h3 className="pb-card-title">Screening answers</h3>
          <ul className="app-answers-list">
            {app.answers.map((answer) => (
              <li key={answer.id}>
                <strong>{answer.question?.questionText ?? 'Question'}</strong>
                <p>{answer.answerText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {app.interviews && app.interviews.length > 0 && (
        <div className="pb-card">
          <h3 className="pb-card-title">Interviews</h3>
          <ul className="app-interview-list">
            {app.interviews.map((interview) => {
              const place = interview.locationOrLink?.trim();
              const meetingUrl = place && /^https?:\/\/\S+$/i.test(place) ? place : null;
              const placeLabel = interview.interviewType === 'video'
                ? 'Meeting link' : interview.interviewType === 'phone' ? 'Phone / instructions' : 'Location';
              return (
                <li key={interview.id} className="candidate-interview">
                  <div className="candidate-interview-heading">
                    <strong>{interview.interviewType === 'in_person' ? 'In-person interview' : `${prettyEnum(interview.interviewType)} interview`}</strong>
                    <span className="badge">{prettyEnum(interview.status)}</span>
                  </div>
                  <dl className="candidate-interview-details">
                    <div>
                      <dt>Date &amp; time</dt>
                      <dd><time dateTime={interview.scheduledAt}>{shortWhen(interview.scheduledAt)}</time></dd>
                    </div>
                    <div>
                      <dt>{placeLabel}</dt>
                      <dd>{place ? (
                        meetingUrl ? <a href={meetingUrl} target="_blank" rel="noopener noreferrer">{place}</a> : place
                      ) : <span className="muted">Not provided. Contact the employer for details.</span>}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {user?.id && (
        <ApplicationMessages
          events={app.events}
          viewerUserId={user.id}
          counterpartLabel={company}
          canSend={false}
        />
      )}

      <ApplicationTimeline events={app.events} emptyText="No updates yet." />
    </div>
  );
};
