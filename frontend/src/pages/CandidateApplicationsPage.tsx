import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { CompanyLogoMark } from '../components/CompanyLogoMark';
import {
  applicationStatusBadgeClassFor,
  applicationStatusLabel,
} from '../utils/applicationStatus';

function prettyEnum(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export const CandidateApplicationsPage: React.FC = () => {
  const appsQuery = useQuery({
    queryKey: ['candidate', 'applications'],
    queryFn: () => candidateApi.listApplications(),
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
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>My applications</h2>
        <p className="pb-empty" style={{ margin: 0 }}>
          You have not applied to any company vacancies yet.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/jobs" className="btn btn-sm">
            Browse vacancies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-page-stack candidate-applications-list">
      <div className="pb-card apps-list-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>My applications</h2>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {apps.length} application{apps.length === 1 ? '' : 's'} · Track status and updates.
          </p>
        </div>
        <Link to="/jobs" className="btn btn-sm btn-secondary">
          Find more jobs
        </Link>
      </div>

      <div className="apps-card-list">
        {apps.map((app) => {
          const company = app.job?.company?.name ?? 'Company';
          const title = app.job?.title ?? 'Vacancy';
          const location = app.job?.location?.name;
          const employment = prettyEnum(app.job?.employmentType);
          const meta = [location, employment].filter(Boolean);
          const logoId = app.job?.company?.logo?.id ?? app.job?.company?.logoFileId ?? null;

          return (
            <article key={app.id} className="apps-card apps-card--with-logo">
              <div className="apps-card-main">
                <div className="apps-card-logo" aria-hidden={!logoId}>
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
                      <h3>
                        <Link to={`/candidate/applications/${app.id}`}>{title}</Link>
                      </h3>
                      <p className="apps-card-meta">
                        {meta.map((part, index) => (
                          <React.Fragment key={`${app.id}-meta-${index}`}>
                            {index > 0 && (
                              <span className="apps-card-sep" aria-hidden="true">
                                ·
                              </span>
                            )}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                        {meta.length > 0 && (
                          <span className="apps-card-sep" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <time dateTime={app.appliedAt}>
                          Applied{' '}
                          {new Date(app.appliedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </time>
                      </p>
                    </div>
                    <div className="apps-card-side">
                      <span className={applicationStatusBadgeClassFor(app.status, app.resubmittedAt)}>
                        {applicationStatusLabel(app.status, app.resubmittedAt)}
                      </span>
                      {app.status === 'rejected' && app.job?.slug && (
                        <Link
                          to={`/jobs/${app.job.slug}/apply`}
                          className="btn btn-sm app-reapply-btn"
                        >
                          Reapply again
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="apps-card-foot">
                <div className="apps-card-foot-links">
                  {app.job?.slug && (
                    <Link to={`/jobs/${app.job.slug}`} className="apps-text-link">
                      View vacancy
                    </Link>
                  )}
                  {app.status === 'rejected' && app.job?.slug && (
                    <Link to={`/jobs/${app.job.slug}/apply`} className="apps-reapply-link">
                      Reapply again →
                    </Link>
                  )}
                </div>
                <Link to={`/candidate/applications/${app.id}`} className="btn btn-sm apps-view-btn">
                  View application
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
