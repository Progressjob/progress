import React from 'react';
import { Link } from 'react-router-dom';
import type { Company } from '../types/api';
import { CompanyLogoMark } from './CompanyLogoMark';

export const CompanyDirectoryCard: React.FC<{ company: Company }> = ({ company }) => {
  return (
    <div className="company-directory-card">
      <div className="company-card-top">
        <div className="company-avatar-box">
          <CompanyLogoMark
            name={company.name}
            logoId={company.logo?.id ?? company.logoFileId}
            imgClassName="company-logo-img"
          />
        </div>
        <div className="company-card-headings">
          <span className="verified-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Verified Employer
          </span>
          <h3 className="company-title">
            <Link to={`/companies/${company.slug}`}>{company.name}</Link>
          </h3>
        </div>
      </div>

      <div className="company-tags-row">
        <span className="tag-pill tag-category">{company.industry?.name ?? 'General Industry'}</span>
        {company.city && (
          <span className="tag-pill tag-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
            </svg>
            {company.city}
          </span>
        )}
      </div>

      {company.description ? (
        <p className="company-desc-snippet">{company.description}</p>
      ) : (
        <p className="company-desc-snippet muted">
          Verified partner enterprise recruiting qualified workforce through Progress Manpower PLC.
        </p>
      )}

      <div className="company-card-bottom">
        <span className="vacancies-pill">
          <strong>{company._count?.jobs ?? 0}</strong> Open
        </span>
        <Link to={`/companies/${company.slug}`} className="btn-view-company-roles">
          <span>View</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
};
