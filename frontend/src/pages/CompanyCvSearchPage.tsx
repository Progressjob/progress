import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { publicFileUrl } from '../api/files';
import type { TalentCard } from '../types/api';
import { useTalentPortal } from '../utils/talentPortal';

const POPULAR_ROLES = [
  'Accountant',
  'Software Developer',
  'Sales & Marketing',
  'HR Specialist',
  'Logistics',
  'Civil Engineer',
  'Administrative',
  'Electrician',
];
const MIN_QUERY = 2;
const PAGE_SIZE = 12;

function talentLocation(card: TalentCard): string {
  return [card.city, card.region, card.country].filter(Boolean).join(' · ') || 'Ethiopia';
}

function formatYears(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `${shown} ${n === 1 ? 'yr' : 'yrs'} exp`;
}

  function clip(text?: string | null, max = 150): string {
    const value = text?.replace(/\s+/g, ' ').trim() ?? '';
    if (!value) return '';
    if (value.length <= max) return value;
    return `${value.slice(0, max).trim()}…`;
  }

  function initials(card: TalentCard): string {
    return `${card.firstName[0] ?? ''}${card.lastName[0] ?? ''}`.toUpperCase() || 'CV';
  }

  function formatAvailability(status?: string | null): string {
    if (!status) return 'Available for hire';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const TalentResultCard: React.FC<{ card: TalentCard; onView: () => void; viewLabel: string }> = ({
    card,
    onView,
    viewLabel,
  }) => {
    const years = formatYears(card.yearsExperience);
    const photo = card.photoFileId ? publicFileUrl(card.photoFileId) : null;
    const title = card.currentTitle || card.headline || 'Professional Candidate';
    const summary = clip(card.summary);
    const location = talentLocation(card);
    const availability = formatAvailability(card.availabilityStatus);

    return (
              <article className="cv-card-modern">
                {/* Top Banner Row */}
                <div className="cv-card-header">
                  <div className="cv-card-avatar-wrap">
                    {photo ? (
                      <img className="cv-card-avatar-img" src={photo} alt="" />
                    ) : (
                      <div className="cv-card-avatar-fallback">{initials(card)}</div>
                    )}
                    <span className="cv-status-indicator" title={availability} />
                  </div>

                  <div className="cv-card-primary-info">
                    <div className="cv-card-name-row">
                      <h3 className="cv-candidate-name">
                        {card.firstName} {card.lastName}
                      </h3>
                      <span className="verified-badge-pill" title="Verified Candidate">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Verified
                      </span>
                    </div>
                      <p className="cv-card-headline">{title}</p>
                    </div>
                  </div>

                  {/* Meta Pills */}
                  <div className="cv-card-badges-row">
                    <span className="tag-pill tag-location">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" strokeWidth="2" />
                      </svg>
                      {location}
                    </span>
                    {years && (
                        <span className="tag-pill tag-exp">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                          </svg>
                          {years}
          </span>
        )}
                  <span className="tag-pill tag-avail">
                    🟢 {availability}
                  </span>
                </div>

                {/* Summary Snippet */}
                {summary ? (
                  <p className="cv-card-bio">“{summary}”</p>
                ) : (
                  <p className="cv-card-bio muted">Candidate profile active with credentials and experience on file.</p>
                )}

                {/* Card Action */}
                <div className="cv-card-action-bar">
                  <button type="button" className="btn-cv-view" onClick={onView}>
                    <span>{viewLabel}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </article>
              );
};

export const CompanyCvSearchPage: React.FC = () => {
  const portal = useTalentPortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const [draft, setDraft] = useState(query);
  const resultsHeaderRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    if (resultsHeaderRef.current) {
      const topOffset = resultsHeaderRef.current.getBoundingClientRect().top + window.pageYOffset - 85;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  useEffect(() => {
                setDraft(query);
  }, [query]);

  const poolKey = portal.isAdmin ? 'admin' : portal.isBrowse ? 'browse' : portal.companyId;
  const spotlightQuery = useQuery({
    queryKey: ['talent', 'spotlight', poolKey],
    queryFn: () => portal.spotlight(),
    enabled: portal.canQuery,
  });

  const searching = query.length >= MIN_QUERY;
  const searchQuery = useQuery({
    queryKey: ['talent', 'search', poolKey, query, page],
    queryFn: () => portal.search({ q: searching ? query : '', page, limit: PAGE_SIZE }),
    enabled: portal.canQuery,
    placeholderData: keepPreviousData,
  });

  const applySearch = (value: string, nextPage = 1) => {
    const term = value.trim();
              const next = new URLSearchParams();
              if (term.length >= MIN_QUERY) next.set('q', term);
    if (nextPage > 1) next.set('page', String(nextPage));
              setSearchParams(next);
  };

  const handleSubmit = (event: React.FormEvent) => {
                event.preventDefault();
              applySearch(draft);
  };

              if (!portal.canQuery) {
    return (
                <div className="jobs-list-container">
                  <div className="card stack" style={{ maxWidth: 600, margin: '3rem auto', textAlign: 'center', padding: '2.5rem' }}>
                    <h2>Employer Talent Search</h2>
                    <p className="muted">
                      Set up an employer profile first to browse verified candidate CVs and connect with talent from your hiring account.
                    </p>
                    <Link to="/employer/setup" className="btn-nav-register" style={{ margin: '1rem auto 0' }}>
                      Set up Employer Profile →
                    </Link>
                  </div>
                </div>
                );
  }

  const searchableCount = spotlightQuery.data?.searchableCount ?? searchQuery.data?.total ?? 0;
  const results = searchQuery.data?.items ?? [];
  const total = searchQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const listLoading = searchQuery.isLoading;
  const listError = searchQuery.error;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

                return (
                      <div className="jobs-list-container">
                        {/* Header */}
                        <div className="board-header">
                          <span className="section-eyebrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" />
                              <circle cx="9" cy="7" r="4" strokeWidth="2" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" />
                            </svg>
                            Progress Talent Network
                          </span>
                          <h1 className="board-title">Candidate CV Bank & Talent Search</h1>
                          <p className="board-subtitle">
                            Search pre-screened Ethiopian professionals, verified graduates, and skilled specialists ready for immediate placement.
                            {portal.isBrowse
                                ? ' Opening a profile activates hiring features so you can view the complete CV dossier.'
                                : ''}
                          </p>
                        </div>

                            {/* Stats Bar */}
                            <div className="cv-stats-row">
                              <div className="cv-stat-box">
                                <span className="cv-stat-label">Searchable Talent</span>
                                <strong className="cv-stat-number">{spotlightQuery.isLoading ? '…' : searchableCount}</strong>
                                <span className="cv-stat-sub">Verified candidates</span>
                              </div>
                                  <div className="cv-stat-box">
                                    <span className="cv-stat-label">Hiring Access</span>
                                    <strong className="cv-stat-number text-primary" style={{ fontSize: '1.25rem' }}>
                                      {portal.accessLabel}
                                    </strong>
                                    <span className="cv-stat-sub">Direct recruiter access</span>
                                  </div>
                                  <div className="cv-stat-box cv-stat-box-highlight">
                                    <span className="cv-stat-label">Talent Sourcing Hotline</span>
                                    <strong className="cv-stat-number" style={{ fontSize: '1.15rem' }}>+251 949 811 818</strong>
                                    <span className="cv-stat-sub">Progress Dukem Headquarters</span>
                                  </div>
                              </div>

                                  {/* Talent Search Capsule */}
                                  <div className="jobs-filter-card">
                                    <form className="cv-search-form-row" onSubmit={handleSubmit}>
                                      <div className="filter-input-wrap" style={{ flex: 1 }}>
                                        <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                          <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
                                          <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
                                        </svg>
                                        <input
                                          id="cv-q"
                                          type="text"
                                          value={draft}
                                          onChange={(e) => setDraft(e.target.value)}
                                          placeholder="Search by job title, skill, or qualification (e.g. Accountant, Developer, Sales)..."
                                          aria-label="Search candidates"
                                        />
                                        {draft && (
                                          <button
                                            type="button"
                                            className="filter-clear-btn"
                                            onClick={() => {
                                              setDraft('');
                                              applySearch('');
                                            }}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                      <button type="submit" className="btn-search-hero">
                                        <span>Find Talent</span>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                          <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                      </button>
                                    </form>

                                    {/* Popular Tags */}
                                    <div className="cv-popular-row">
                                      <span className="cv-popular-label">Filter:</span>
                                      <div className="cv-popular-tags">
                                        <button
                                          type="button"
                                          className={`cv-tag-pill ${!searching ? 'is-active' : ''}`}
                                          onClick={() => applySearch('')}
                                        >
                                          All
                                        </button>
                                        {POPULAR_ROLES.map((role) => {
                                          const active = query.toLowerCase() === role.toLowerCase();
                                          return (
                                            <button
                                              key={role}
                                              type="button"
                                              className={`cv-tag-pill ${active ? 'is-active' : ''}`}
                                              onClick={() => applySearch(role)}
                                            >
                                              {role}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                </div>

                                  {/* Results Header */}
                                  <div className="cv-results-header" ref={resultsHeaderRef}>
                                    <div>
                                      <h2 className="cv-results-title">
                                        {searching ? `Matching candidates for “${query}”` : 'All professional talent'}
                                      </h2>
                                      <p className="cv-results-subtitle">
                                        {searchQuery.data
                                          ? searching
                                            ? `Showing ${results.length} of ${total} matching candidate profile${total === 1 ? '' : 's'}.`
                                            : `Showing ${results.length} of ${total} candidate profile${total === 1 ? '' : 's'}.`
                                          : 'Loading candidate pool…'}
                                      </p>
                                    </div>
                                  </div>

      {listLoading && (
                                    <div className="jobs-loading-grid">
                                      {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="job-card-skeleton" />
                                      ))}
                                    </div>
                                  )}

                                  {listError && (
                                    <div className="alert-box-error">
                                      Failed to load candidate profiles: {(listError as Error).message}
                                    </div>
                                  )}

                                  {!listLoading && !listError && results.length === 0 && (
                                        <div className="empty-results-box">
                                          <div className="empty-icon-circle">👤</div>
                                          <h3>{searching ? 'No matching candidate CVs found' : 'No candidate profiles yet'}</h3>
                                          <p>
                                            {searching
                                            ? 'Try broader keywords such as "sales", "finance", "engineer", or select All to browse every profile.'
              : 'Candidates will appear here as profiles are published.'}
                                          </p>
                                          {searching && (
                                            <button
                                              type="button"
                                              className="btn-nav-register"
                                              onClick={() => {
                                                setDraft('');
                                                applySearch('');
                                              }}
                                            >
                                              Clear Search
                                            </button>
                                          )}
                                        </div>
      )}

                                        {/* Talent Cards Grid */}
                                        {results.length > 0 && (
                                            <div className="cv-grid">
                                              {results.map((card) => (
                                                <TalentResultCard
                                                  key={card.id}
                                                  card={card}
                                                  viewLabel={portal.isBrowse ? 'Check Full CV → Hire' : 'Check Full CV'}
                                                  onView={() => portal.openProfile(card.id)}
                                                />
                                              ))}
                                            </div>
      )}

                                            {total > PAGE_SIZE && (
                                                <div className="pagination-wrapper" style={{ marginTop: '2.5rem' }}>
                                                  <button
                                                    type="button"
                                                    className="pagination-btn"
                                                    disabled={page <= 1}
                                                    onClick={() => {
                                                      applySearch(query, page - 1);
                                                      scrollToResults();
                                                    }}
                                                  >
                                                    ← Previous
                                                  </button>
                                                  {pageNumbers.map((n) => (
                                                    <button
                                                      key={n}
                                                      type="button"
                                                      className={`pagination-btn${n === page ? ' is-current' : ''}`}
                                                      disabled={n === page}
                                                      onClick={() => {
                                                        applySearch(query, n);
                                                        scrollToResults();
                                                      }}
                                                    >
                                                      Page {n}
                                                    </button>
                                                  ))}
                                                    <button
                                                      type="button"
                                                      className="pagination-btn"
                                                      disabled={page >= totalPages}
                                                      onClick={() => {
                                                        applySearch(query, page + 1);
                                                        scrollToResults();
                                                      }}
                                                    >
                                                      Next →
                                                    </button>
                                                </div>
      )}
                                              </div>
                                            );
};
