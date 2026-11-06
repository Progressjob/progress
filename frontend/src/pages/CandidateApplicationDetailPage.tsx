import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { CompanyLogoMark } from '../components/CompanyLogoMark';
import {
  TERMINAL_APPLICATION_STATUSES,
  formatApplicationStatus,
} from '../utils/applicationStatus';

function prettyEnum(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export const CandidateApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="cw-page-stack">
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
                {app.job?.applicationDeadline && (
                  <p className="muted" style={{ margin: '0.45rem 0 0' }}>
                    Deadline{' '}
                    {new Date(app.job.applicationDeadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <div className="apps-card-side apps-card-side--detail">
                {app.job?.slug && (
                  <Link to={`/jobs/${app.job.slug}`} className="btn btn-sm btn-secondary">
                    View vacancy
                  </Link>
                )}
                {app.job?.company?.slug && (
                  <Link to={`/companies/${app.job.company.slug}`} className="apps-text-link">
                    Company page
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-card">
        <div className="apps-card-top" style={{ alignItems: 'flex-start' }}>
          <div className="apps-card-copy">
            <p className="apps-vacancy-label">Your application</p>
            <h3 style={{ margin: '0.15rem 0 0.35rem', fontSize: '1.05rem' }}>
              Status & activity
            </h3>
            <p style={{ margin: 0 }}>
              Applied{' '}
              {new Date(app.appliedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {app.job?.company?.name ? ` to ${app.job.company.name}` : ''}
            </p>
          </div>
          <div className="apps-card-side">
            <span className="badge badge-info">{formatApplicationStatus(app.status)}</span>
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
        {withdrawMutation.isError && (
          <div className="alert-error" style={{ marginTop: '0.75rem' }}>
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

      {app.interviews && app.interviews.length > 0 && (
        <div className="pb-card">
          <h3 className="pb-card-title">Interviews</h3>
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {app.interviews.map((interview) => (
              <li key={interview.id} className="apps-card" style={{ marginBottom: '0.5rem' }}>
                <strong>{interview.interviewType.replace(/_/g, ' ')}</strong>
                <span className="apps-card-sep">·</span>
                {new Date(interview.scheduledAt).toLocaleString()}
                <span className="apps-card-sep">·</span>
                <span className="badge">{interview.status}</span>
                {interview.locationOrLink && (
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {interview.locationOrLink}
                  </p>
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
            No updates yet.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {app.events.map((event) => {
              const isMessage =
                event.oldStatus === event.newStatus && Boolean(event.note?.trim());
              return (
                <li key={event.id} style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <strong>
                      {isMessage
                        ? 'Message from employer'
                        : formatApplicationStatus(event.newStatus)}
                    </strong>
                    <span className="muted" style={{ marginLeft: '0.5rem' }}>
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
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
