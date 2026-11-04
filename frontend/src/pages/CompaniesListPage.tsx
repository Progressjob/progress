import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { companiesApi } from '../api/companies';
import { taxonomyApi } from '../api/taxonomy';
import { CompanyDirectoryCard } from '../components/CompanyDirectoryCard';

export const CompaniesListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 12;
  const gridRef = useRef<HTMLDivElement>(null);

  const industrySlug = searchParams.get('industry') || '';

  const industriesQuery = useQuery({
    queryKey: ['taxonomy', 'industries'],
    queryFn: () => taxonomyApi.industries(),
  });

  const industries = industriesQuery.data ?? [];
  const selectedIndustry = industries.find((item) => item.slug === industrySlug);
  const industryId = selectedIndustry?.id;

  useEffect(() => {
    setPage(1);
  }, [industrySlug]);

  const scrollToGrid = () => {
    if (gridRef.current) {
      const topOffset = gridRef.current.getBoundingClientRect().top + window.pageYOffset - 85;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  const setIndustry = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('industry', slug);
    else next.delete('industry');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const companiesQuery = useQuery({
    queryKey: ['companies', page, limit, industryId ?? null],
    queryFn: () => companiesApi.list(page, limit, industryId ? { industryId } : undefined),
    // Wait for taxonomy when a slug is present so we don't flash unfiltered results
    enabled: !industrySlug || industriesQuery.isFetched,
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

  const isLoading =
    companiesQuery.isLoading || (Boolean(industrySlug) && !industriesQuery.isFetched);
  const hasActiveFilters = Boolean(search.trim() || industrySlug);
  const clearFilters = () => {
    setSearch('');
    setIndustry('');
  };

  return (
    <div className="jobs-list-container companies-directory-container">
      <div className="board-header">
        <span className="section-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
          </svg>
          Enterprise Partners
        </span>
        <h1 className="board-title">Verified Employer Directory</h1>
        <p className="board-subtitle companies-board-subtitle">
          Leading enterprises, industrial manufacturers, logistics hubs, and corporate organizations in
          Ethiopia partnering with Progress Manpower Supply & Training PLC for specialized recruitment.
        </p>
      </div>

      <div className="jobs-filter-card companies-search-card">
        <div className="filter-input-wrap">
          <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search companies"
          />
          {search && (
            <button type="button" className="filter-clear-btn" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>

        <div className="companies-industry-filters" role="group" aria-label="Filter by industry">
          <span className="companies-industry-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Industry
          </span>
          <div className="companies-industry-scroller">
            <div className="companies-industry-chips">
              <button
                type="button"
                className={`companies-industry-chip${!industrySlug ? ' is-active' : ''}`}
                onClick={() => setIndustry('')}
                aria-pressed={!industrySlug}
              >
                All
              </button>
              {industries.map((industry) => {
                const active = industry.slug === industrySlug;
                return (
                  <button
                    key={industry.id}
                    type="button"
                    className={`companies-industry-chip${active ? ' is-active' : ''}`}
                    onClick={() => setIndustry(active ? '' : industry.slug)}
                    aria-pressed={active}
                  >
                    {industry.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {industrySlug && selectedIndustry && (
          <div className="companies-active-filter">
            <span>
              Showing <strong>{selectedIndustry.name}</strong> employers
            </span>
            <button type="button" className="companies-clear-industry" onClick={() => setIndustry('')}>
              Clear industry
            </button>
          </div>
        )}
        {industrySlug && !selectedIndustry && !industriesQuery.isLoading && (
          <div className="companies-active-filter">
            <span>Unknown industry filter</span>
            <button type="button" className="companies-clear-industry" onClick={() => setIndustry('')}>
              Clear industry
            </button>
          </div>
        )}
      </div>

      {isLoading && (
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

      {!isLoading && filtered.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">🏢</div>
          <h3>No partner organizations found</h3>
          <p>
            {hasActiveFilters
              ? 'Try a different industry or search keyword.'
              : 'Verified companies will appear here once registered.'}
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn-nav-register" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="companies-grid" ref={gridRef}>
        {filtered.map((c) => (
          <CompanyDirectoryCard key={c.id} company={c} />
        ))}
      </div>

      {companies.length > 0 && (
        <div className="pagination-wrapper">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              scrollToGrid();
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
              scrollToGrid();
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
