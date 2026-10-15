import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';

export const CompaniesListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 12;

  const companiesQuery = useQuery({
    queryKey: ['companies', page, limit],
    queryFn: () => companiesApi.list(page, limit),
  });

  const companies = companiesQuery.data ?? [];

  return (
    <div className="companies-page-container">
      {/* Header */}
      <div className="board-header">
        <span className="section-eyebrow">Enterprise Partners</span>
        <h1 className="board-title">Verified Employer Directory</h1>
        <p className="board-subtitle">
          Leading enterprises, industrial manufacturers, and NGOs partnering with Progress Manpower Supply & Training PLC for specialized talent recruitment.
        </p>
      </div>

      {companiesQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {companiesQuery.isError && (
        <div className="alert-box-error">
          Failed to load employer directory: {(companiesQuery.error as Error).message}
        </div>
      )}

      {!companiesQuery.isLoading && companies.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">🏢</div>
          <h3>No partner organizations listed</h3>
          <p>Verified companies will appear here once registered.</p>
        </div>
      )}

      <div className="companies-grid">
        {companies.map((c) => (
          <div key={c.id} className="company-directory-card">
            <div className="company-card-top">
              <div className="company-avatar-box">
                {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="company-card-headings">
                <span className="verified-badge">✓ Verified Employer</span>
                <h3 className="company-title">
                  <Link to={`/companies/${c.slug}`}>{c.name}</Link>
                </h3>
              </div>
            </div>

            <div className="company-tags-row">
              <span className="tag-pill tag-category">
                {c.industry?.name ?? 'General Industry'}
              </span>
              {c.city && (
                <span className="tag-pill tag-location">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  </svg>
                  {c.city}
                </span>
              )}
            </div>

            {c.description ? (
              <p className="company-desc-snippet">{c.description}</p>
            ) : (
              <p className="company-desc-snippet muted">
                Verified partner employer recruiting talent through Progress Manpower PLC.
              </p>
            )}

            <div className="company-card-bottom">
              <span className="vacancies-pill">
                <strong>{c._count?.jobs ?? 0}</strong> Open Vacancies
              </span>
              <Link to={`/companies/${c.slug}`} className="btn-view-company-roles">
                <span>View Roles</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {companies.length > 0 && (
        <div className="pagination-wrapper">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span className="pagination-info">Page <strong>{page}</strong></span>
          <button
            type="button"
            className="pagination-btn"
            disabled={companies.length < limit}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
