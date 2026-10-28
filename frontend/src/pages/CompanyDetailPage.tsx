import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';
import { publicFileUrl } from '../api/files';

export const CompanyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const companyQuery = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.detail(slug!),
    enabled: Boolean(slug),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '320px' }} />
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
        <div className="jobs-list-container">
          <div className="alert-box-error">
            <h2>Employer Profile Not Found</h2>
            <p>{(companyQuery.error as Error)?.message || 'Unable to locate this company profile.'}</p>
            <Link to="/jobs" className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              ← Back to Vacancies
            </Link>
          </div>
        </div>
        );
  }

        const company = companyQuery.data;
        const logoUrl = company.logo?.id ? publicFileUrl(company.logo.id) : null;
        const initial = company.name ? company.name.charAt(0).toUpperCase() : 'C';

        return (
          <div className="jobs-list-container">
            {/* Breadcrumbs */}
            <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/companies">Employers</Link>
              <span>/</span>
              <span className="current-crumb">{company.name}</span>
            </nav>

              {/* Company Executive Hero Header */}
              <header className="jd-header-hero">
                <div className="jd-header-top">
                  <div className="jd-company-avatar">
                    {logoUrl ? (
                      <img src={logoUrl} alt={company.name} className="jd-company-logo-img" />
                    ) : (
                      <div className="jd-company-monogram">{initial}</div>
                    )}
                  </div>

                  <div className="jd-header-info">
                    <div className="jd-kicker-row">
                      <span className="verified-badge-pill">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Verified Employer Partner
                      </span>
                    </div>

                    <h1 className="jd-title">{company.name}</h1>

                    <div className="jd-meta-line">
                      {company.industry?.name && (
                        <span className="tag-pill tag-category">{company.industry.name}</span>
                      )}
                      {company.city && (
                        <span className="tag-pill tag-location">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                          </svg>
                          {company.city}{company.region ? `, ${company.region}` : ''}
                        </span>
                      )}
                      {company.companySize && (
                        <span className="tag-pill">
                          👥 {company.companySize} employees
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {company.websiteUrl && (
                      <div className="jd-header-actions">
                        <a
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <span>Visit Official Website</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                    </div>
        )}
                  </header>

            {/* About Company Card */}
            {company.description && (
              <section className="jd-card" style={{ marginBottom: '2.5rem' }}>
                <h2 className="jd-heading">About {company.name}</h2>
                <p className="jd-plain-text" style={{ whiteSpace: 'pre-line' }}>{company.description}</p>
              </section>
            )}

              {/* Published Vacancies Section */}
              <section className="company-jobs-section">
                <div className="section-header-row" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <span className="section-eyebrow">Vacancies</span>
                    <h2 style={{ margin: '0.25rem 0', fontSize: '1.45rem' }}>
                      Open Vacancies at {company.name} ({company.jobs?.length ?? 0})
                    </h2>
                  </div>
                </div>

                {!company.jobs || company.jobs.length === 0 ? (
          <div className="empty-results-box">
            <div className="empty-icon-circle">💼</div>
            <h3>No active published vacancies</h3>
            <p>This employer currently does not have open vacancies on the public board.</p>
            <Link to="/jobs" className="btn-nav-register" style={{ marginTop: '0.75rem' }}>
              Explore Other Vacancies
            </Link>
          </div>
                ) : (
                    <div className="jobs-board-grid">
                      {company.jobs.map((job) => (
                                <div key={job.id} className="premium-job-card">
                                  <div className="job-card-main-content">
                                    <div className="company-badge-wrap">
                                      {logoUrl ? (
                                        <img src={logoUrl} alt={company.name} className="company-logo-img" />
                                      ) : (
                                        <div className="company-badge">{initial}</div>
                                      )}
                                    </div>
                                    <div className="job-card-meta">
                                      <span className="job-company-name">{company.name}</span>
                                      <h2 className="job-card-title">
                                        <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                                    </h2>
                                    <div className="job-card-tags">
                                      <span className="tag-pill tag-type">
                                        {job.employmentType.replace('_', ' ').toUpperCase()}
                                      </span>
                                      {job.workplaceType && (
                                        <span className="tag-pill tag-workplace">
                                          {job.workplaceType.replace('_', ' ').toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="job-card-footer">
                                  <span className="job-deadline-tag">
                                    Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                                  </span>
                                  <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                                    <span>View Position</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                  </Link>
                                </div>
                            </div>
            ))}
                          </div>
        )}
      </section>
                  </div>
                );
};
