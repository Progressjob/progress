import { BackButton } from './BackButton';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Company, Job } from '../types/api';
import { CompanyLogoMark } from './CompanyLogoMark';
import { formatCompanySize } from '../constants/companySize';

function labelType(value?: string | null): string {
  return (value ?? '').replaceAll('_', ' ');
}

export const CompanyOverview: React.FC<{
  company: Company;
  jobs?: Job[];
  editHref?: string;
  showBreadcrumbs?: boolean;
}> = ({ company, jobs, editHref, showBreadcrumbs = false }) => {
  const logoId = company.logo?.id ?? company.logoFileId ?? null;
  const sizeLabel = formatCompanySize(company.companySize);
  const locationLine = [company.city, company.region]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const vacancies = jobs ?? company.jobs ?? [];
  const hasStory = Boolean(company.description?.trim() || company.vision?.trim() || company.mission?.trim());
  const hasContact = Boolean(
    company.websiteUrl?.trim() ||
      company.email?.trim() ||
      company.phone?.trim() ||
      company.address?.trim(),
  );

  return (
    <div className="co-profile">
      {showBreadcrumbs && (
        <BackButton fallback="/companies" />
      )}

      <header className="co-profile-hero">
        <div className="co-profile-banner" aria-hidden="true" />
        <div className="co-profile-identity">
          <div className="co-profile-logo">
            <CompanyLogoMark
              name={company.name}
              logoId={logoId}
              className="co-profile-logo-fallback"
              imgClassName="co-profile-logo-img"
            />
          </div>
          <div className="co-profile-id">
            <div className="co-profile-id-top">
              <div>
                <h1 className="co-profile-name">{company.name}</h1>
                {company.industry?.name && (
                  <span className="co-profile-industry">{company.industry.name}</span>
                )}
              </div>
              {editHref && (
                <Link to={editHref} className="btn-nav-register co-profile-edit">
                  Edit profile
                </Link>
              )}
            </div>
            <ul className="co-profile-facts">
              {locationLine && (
                <li>
                  <span>Location</span>
                  <strong>
                    {locationLine}
                    {company.country?.trim() ? `, ${company.country.trim()}` : ''}
                  </strong>
                </li>
              )}
              {sizeLabel && (
                <li>
                  <span>Company size</span>
                  <strong>{sizeLabel}</strong>
                </li>
              )}
              {company.foundedYear && (
                <li>
                  <span>Founded</span>
                  <strong>{company.foundedYear}</strong>
                </li>
              )}
            </ul>
          </div>
        </div>
      </header>

      {hasStory && (
        <section className="co-profile-card">
          <h2 className="co-profile-card-title">Working at {company.name}</h2>
          {company.description?.trim() && (
            <p className="co-profile-copy">{company.description}</p>
          )}
          {company.vision?.trim() && (
            <>
              <h3 className="co-profile-subtitle">Vision</h3>
              <p className="co-profile-copy">{company.vision}</p>
            </>
          )}
          {company.mission?.trim() && (
            <>
              <h3 className="co-profile-subtitle">Mission</h3>
              <p className="co-profile-copy">{company.mission}</p>
            </>
          )}
        </section>
      )}

      {hasContact && (
        <section className="co-profile-card">
          <h2 className="co-profile-card-title">Contact</h2>
          <dl className="co-profile-contact">
            {company.websiteUrl?.trim() && (
              <div>
                <dt>Website</dt>
                <dd>
                  <a href={company.websiteUrl} target="_blank" rel="noreferrer">
                    {company.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                </dd>
              </div>
            )}
            {company.email?.trim() && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
              </div>
            )}
            {company.phone?.trim() && (
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${company.phone}`}>{company.phone}</a>
                </dd>
              </div>
            )}
            {company.address?.trim() && (
              <div>
                <dt>Address</dt>
                <dd>{company.address}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="co-profile-jobs">
        <h2 className="co-profile-jobs-title">
          Open vacancies
          <span>{vacancies.length}</span>
        </h2>
        {vacancies.length === 0 ? (
          <div className="empty-results-box">
            <h3>No open vacancies</h3>
            <p>This employer currently does not have published roles on the board.</p>
            <Link to="/jobs" className="btn-nav-register" style={{ marginTop: '0.75rem' }}>
              Explore other vacancies
            </Link>
          </div>
        ) : (
          <div className="jobs-board-grid">
            {vacancies.map((job) => (
              <article key={job.id} className="premium-job-card">
                <div className="job-card-main-content">
                  <div className="company-badge-wrap">
                    <CompanyLogoMark
                      name={company.name}
                      logoId={logoId}
                      className="company-badge"
                      imgClassName="company-logo-img"
                    />
                  </div>
                  <div className="job-card-meta">
                    <span className="job-company-name">{company.name}</span>
                    <h3 className="job-card-title">
                      <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                    </h3>
                    <div className="job-card-tags">
                      <span className="tag-pill tag-type">{labelType(job.employmentType)}</span>
                      {job.workplaceType && (
                        <span className="tag-pill tag-workplace">{labelType(job.workplaceType)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="job-card-footer">
                  <span className="job-deadline-tag">
                    Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                  </span>
                  <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                    <span>View position</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
