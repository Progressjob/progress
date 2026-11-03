import { BackButton } from './BackButton';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Company, Job } from '../types/api';
import { CompanyLogoMark } from './CompanyLogoMark';
import { formatCompanySize } from '../constants/companySize';
import { FeaturedVacancies } from './jobs/FeaturedVacancies';

export const CompanyOverview: React.FC<{
  company: Company;
  jobs?: Job[];
  editHref?: string;
  showBreadcrumbs?: boolean;
  children?: React.ReactNode;
}> = ({ company, jobs, editHref, showBreadcrumbs = false, children }) => {
  const logoId = company.logo?.id ?? company.logoFileId ?? null;
  const sizeLabel = formatCompanySize(company.companySize);
  const locationLine = [company.city, company.region]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const vacancies = jobs ?? company.jobs ?? [];
  const jobsWithCompany = vacancies.map((job) => ({
    ...job,
    company: job.company ?? company,
  }));
  const about = company.description?.trim();
  const vision = company.vision?.trim();
  const mission = company.mission?.trim();
  const hasContact = Boolean(
    company.websiteUrl?.trim() ||
      company.email?.trim() ||
      company.phone?.trim() ||
      company.address?.trim(),
  );

  return (
    <div className="co-profile">
      {showBreadcrumbs && <BackButton fallback="/companies" />}

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
                    {company.country?.trim() ? `${locationLine}, ${company.country.trim()}` : locationLine}
                  </strong>
                </li>
              )}
              {sizeLabel && (
                <li>
                  <span>Employees</span>
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

      {about && (
        <section className="co-profile-card">
          <h2 className="co-profile-card-title">About {company.name}</h2>
          <p className="co-profile-copy">{about}</p>
        </section>
      )}

      {(vision || mission) && (
        <div className="co-profile-statements">
          {vision && (
            <section className="co-profile-card">
              <h2 className="co-profile-card-title">Vision</h2>
              <p className="co-profile-copy">{vision}</p>
            </section>
          )}
          {mission && (
            <section className="co-profile-card">
              <h2 className="co-profile-card-title">Mission</h2>
              <p className="co-profile-copy">{mission}</p>
            </section>
          )}
        </div>
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
        {vacancies.length === 0 ? (
          <>
            <h2 className="co-profile-jobs-title">
              Open vacancies
              <span>0</span>
            </h2>
            <div className="empty-results-box">
              <h3>No open vacancies</h3>
              <p>This employer currently does not have published roles on the board.</p>
              <Link to="/jobs" className="btn-nav-register" style={{ marginTop: '0.75rem' }}>
                Explore other vacancies
              </Link>
            </div>
          </>
        ) : (
          <FeaturedVacancies
            jobs={jobsWithCompany}
            title="Open vacancies"
            description={`${vacancies.length} current ${vacancies.length === 1 ? 'opening' : 'openings'}`}
            badge="Open"
          />
        )}
      </section>

      {children}
    </div>
  );
};
