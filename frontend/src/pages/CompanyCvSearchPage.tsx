import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicFileUrl } from '../api/files';
import type { TalentCard } from '../types/api';
import { useTalentPortal } from '../utils/talentPortal';

const POPULAR_ROLES = ['Accountant', 'Sales', 'HR', 'Logistics'];
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
  return `${shown} yr`;
}

function clip(text?: string | null, max = 140): string {
  const value = text?.replace(/\s+/g, ' ').trim() ?? '';
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

function initials(card: TalentCard): string {
  return `${card.firstName[0] ?? ''}${card.lastName[0] ?? ''}`.toUpperCase() || 'CV';
}

const TalentResultCard: React.FC<{ card: TalentCard; onView: () => void; viewLabel: string }> = ({
  card,
  onView,
  viewLabel,
}) => {
  const years = formatYears(card.yearsExperience);
  const photo = card.photoFileId ? publicFileUrl(card.photoFileId) : null;
  const title = card.currentTitle || card.headline || 'Professional';
  const summary = clip(card.summary);

  return (
    <article className="card cv-card">
      <div className="cv-card-top">
        {photo ? (
          <img className="cv-card-photo" src={photo} alt="" />
        ) : (
          <div className="cv-card-photo cv-card-photo-fallback" aria-hidden>
            {initials(card)}
          </div>
        )}
        <div className="cv-card-identity">
          <h3>
            {card.firstName} {card.lastName}
          </h3>
          <p className="cv-card-meta">
            {talentLocation(card)}
            {card.gender ? ` · ${card.gender}` : ''}
          </p>
        </div>
        {years && (
          <div className="cv-card-years">
            <span>Exp</span>
            {years}
          </div>
        )}
      </div>
      <p className="cv-card-role">{title}</p>
      {summary ? <p className="cv-card-summary">{summary}</p> : <p className="muted">No summary yet.</p>}
      <button type="button" className="btn btn-sm" onClick={onView}>
        {viewLabel}
      </button>
    </article>
  );
};

export const CompanyCvSearchPage: React.FC = () => {
  const portal = useTalentPortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const spotlightQuery = useQuery({
    queryKey: ['talent', 'spotlight', portal.isAdmin ? 'admin' : portal.isBrowse ? 'browse' : portal.companyId],
    queryFn: () => portal.spotlight(),
    enabled: portal.canQuery,
  });

  const searching = query.length >= MIN_QUERY;
  const searchQuery = useQuery({
    queryKey: [
      'talent',
      'search',
      portal.isAdmin ? 'admin' : portal.isBrowse ? 'browse' : portal.companyId,
      query,
      page,
    ],
    queryFn: () => portal.search({ q: query, page, limit: PAGE_SIZE }),
    enabled: portal.canQuery && searching,
  });

  const applySearch = (value: string, nextPage = 1) => {
    const term = value.trim();
    const next = new URLSearchParams();
    if (term) next.set('q', term);
    if (nextPage > 1) next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applySearch(draft);
  };

  if (!portal.canQuery) {
    return (
      <div className="card stack">
        <h2>CV search</h2>
        <p className="muted">Set up an employer profile first, then search candidate CVs from this hiring account.</p>
        <Link to="/employer/setup" className="btn btn-sm">
          Set up employer profile →
        </Link>
      </div>
    );
  }

  const searchableCount = spotlightQuery.data?.searchableCount ?? 0;
  const results = searching ? (searchQuery.data?.items ?? []) : (spotlightQuery.data?.items ?? []);
  const total = searchQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const listLoading = searching ? searchQuery.isLoading : spotlightQuery.isLoading;
  const listError = searching ? searchQuery.error : spotlightQuery.error;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>CV search</h1>
        <p className="muted">
          Search by role or skill. Results only include people who match what you typed — not the full
          candidate list.
          {portal.isBrowse
            ? ' Opening a profile switches this account to hiring so you can view the full CV.'
            : ''}
        </p>
      </div>

      <div className="grid-stats">
        <div className="card stat-card">
          <span className="stat-label">Searchable CVs</span>
          <strong className="stat-value">{spotlightQuery.isLoading ? '—' : searchableCount}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Access</span>
          <strong className="stat-value" style={{ fontSize: '1.05rem' }}>
            {portal.accessLabel}
          </strong>
        </div>
      </div>

      <form className="card cv-search-form" onSubmit={handleSubmit}>
        <div className="field" style={{ flex: 1, minWidth: '220px' }}>
          <label htmlFor="cv-q">Role or skill</label>
          <input
            id="cv-q"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. developer, accountant, sales"
          />
        </div>
        <button type="submit" className="btn">
          Find talent
        </button>
      </form>

      <div className="cv-popular">
        <span className="muted">Popular:</span>
        {POPULAR_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={query.toLowerCase() === role.toLowerCase() ? 'is-active' : undefined}
            onClick={() => applySearch(role)}
          >
            {role}
          </button>
        ))}
      </div>

      {draft.trim().length > 0 && draft.trim().length < MIN_QUERY && !searching && (
        <p className="muted">Type at least {MIN_QUERY} characters to search.</p>
      )}

      <div>
        <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem' }}>
          {searching ? `Matching “${query}”` : 'Featured professionals'}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {searching
            ? searchQuery.data
              ? `${total} profile${total === 1 ? '' : 's'} ${total === 1 ? 'matches' : 'match'} this request.`
              : 'Searching verified profiles…'
            : 'A short look at recently updated talent. Search a role or skill to find the right CVs.'}
        </p>
      </div>

      {listLoading && <div className="card">Loading profiles…</div>}
      {listError && <div className="alert-box-error">{(listError as Error).message}</div>}

      {!listLoading && !listError && results.length === 0 && (
        <div className="card">
          <h3>{searching ? 'No matching CVs' : 'No featured profiles yet'}</h3>
          <p className="muted">
            {searching
              ? 'Try another role, skill, or a broader keyword.'
              : 'Candidates become searchable when their profile is visible to employers.'}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid-cards">
          {results.map((card) => (
            <TalentResultCard
              key={card.id}
              card={card}
              viewLabel={portal.isBrowse ? 'View CV → hire' : 'View CV'}
              onView={() => portal.openProfile(card.id)}
            />
          ))}
        </div>
      )}

      {searching && total > PAGE_SIZE && (
        <div className="cv-pager">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => applySearch(query, page - 1)}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page >= totalPages}
            onClick={() => applySearch(query, page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
