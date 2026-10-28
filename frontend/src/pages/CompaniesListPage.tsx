import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';
import { publicFileUrl } from '../api/files';

export const CompaniesListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 12;

  const companiesQuery = useQuery({
    queryKey: ['companies', page, limit],
    queryFn: () => companiesApi.list(page, limit),
  });

  const companies = companiesQuery.data ?? [];
  const filtered = companies.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.industry?.name?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term)
    );
  });

  return (
      <div className="jobs-list-container">
        {/* Header */}
        <div className="board-header">
          <span className="section-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
            </svg>
            Enterprise Partners
          </span>
          <h1 className="board-title">Verified Employer Directory</h1>
          <p className="board-subtitle">
            Leading enterprises, industrial manufacturers, logistics hubs, and corporate organizations in Ethiopia partnering with Progress Manpower Supply & Training PLC for specialized recruitment.
          </p>
        </div>

        {/* Search Bar */}
        <div className="jobs-filter-card" style={{ marginBottom: '2.5rem' }}>
          <div className="filter-input-wrap">
            <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search employers by company name, industry, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter employers"
            />
            {search && (
              <button type="button" className="filter-clear-btn" onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>
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

          {!companiesQuery.isLoading && filtered.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">🏢</div>
          <h3>No partner organizations found</h3>
          <p>{search ? 'Try adjusting your search keyword.' : 'Verified companies will appear here once registered.'}</p>
          {search && (
            <button type="button" className="btn-nav-register" onClick={() => setSearch('')}>
              Clear Filter
            </button>
          )}
        </div>
      )}

        {/* Modern Companies Grid */}
        <div className="companies-grid">
        {filtered.map((c) => {
                      const logoUrl = c.logo?.id ? publicFileUrl(c.logo.id) : null;
                      const initial = c.name ? c.name.charAt(0).toUpperCase() : 'C';

                      return (
            <div key={c.id} className="company-directory-card">
              <div className="company-card-top">
                <div className="company-avatar-box">
                  {logoUrl ? (
                    <img src={logoUrl} alt={c.name} />
                  ) : (
                    initial
                  )}
                </div>
                <div className="company-card-headings">
                  <span className="verified-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Verified Employer
                  </span>
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
                  Verified partner enterprise recruiting qualified workforce through Progress Manpower PLC.
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
                );
        })}
              </div>

              {companies.length > 0 && (
                <div className="pagination-wrapper">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    ← Previous
                  </button>
                  <span className="pagination-info">
                    Page <strong>{page}</strong>
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={companies.length < limit}
                    onClick={() => {
                      setPage((p) => p + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          );
};
