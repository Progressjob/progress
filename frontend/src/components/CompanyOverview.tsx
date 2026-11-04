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
                <li className="co-fact-item">
                  <span className="co-fact-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-fact-icon">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Location
                  </span>
                  <strong className="co-fact-value">
                    {company.country?.trim() ? `${locationLine}, ${company.country.trim()}` : locationLine}
                  </strong>
                </li>
              )}
              {sizeLabel && (
                <li className="co-fact-item">
                  <span className="co-fact-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-fact-icon">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Employees
                  </span>
                  <strong className="co-fact-value">{sizeLabel}</strong>
                </li>
              )}
              {company.foundedYear && (
                <li className="co-fact-item">
                  <span className="co-fact-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-fact-icon">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Founded
                  </span>
                  <strong className="co-fact-value">{company.foundedYear}</strong>
                </li>
              )}
            </ul>
          </div>
        </div>
      </header>

      {about && (
        <section className="co-profile-card co-about-card">
          <h2 className="co-profile-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-card-icon">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            About {company.name}
          </h2>
          <p className="co-profile-copy">{about}</p>
        </section>
      )}

      {(vision || mission) && (
        <div className="co-profile-statements">
          {vision && (
            <section className="co-profile-card co-statement-card co-vision-card">
              <h2 className="co-profile-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-card-icon">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Vision
              </h2>
              <p className="co-profile-copy">{vision}</p>
            </section>
          )}
          {mission && (
            <section className="co-profile-card co-statement-card co-mission-card">
              <h2 className="co-profile-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-card-icon">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Mission
              </h2>
              <p className="co-profile-copy">{mission}</p>
            </section>
          )}
        </div>
      )}

      {hasContact && (
        <section className="co-profile-card co-contact-card">
          <h2 className="co-profile-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="co-card-icon">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Contact
          </h2>
          <div className="co-profile-contact-grid">
            {company.websiteUrl?.trim() && (
              <a
                href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                target="_blank"
                rel="noreferrer"
                className="co-contact-item"
              >
                <div className="co-contact-icon-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="co-contact-content">
                  <span className="co-contact-label">Website</span>
                  <strong className="co-contact-value">{company.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</strong>
                </div>
              </a>
            )}
            {company.email?.trim() && (
              <a href={`mailto:${company.email}`} className="co-contact-item">
                <div className="co-contact-icon-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="co-contact-content">
                  <span className="co-contact-label">Email</span>
                  <strong className="co-contact-value">{company.email}</strong>
                </div>
              </a>
            )}
            {company.phone?.trim() && (
              <a href={`tel:${company.phone}`} className="co-contact-item">
                <div className="co-contact-icon-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="co-contact-content">
                  <span className="co-contact-label">Phone</span>
                  <strong className="co-contact-value">{company.phone}</strong>
                </div>
              </a>
            )}
            {company.address?.trim() && (
              <div className="co-contact-item">
                <div className="co-contact-icon-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="co-contact-content">
                  <span className="co-contact-label">Address</span>
                  <strong className="co-contact-value">{company.address}</strong>
                </div>
              </div>
            )}
          </div>
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
