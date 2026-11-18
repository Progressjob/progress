import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendations';
import { candidateDate, recommendationStatus } from '../utils/candidatePresentation';

const FILTERS = ['all', 'sent', 'viewed', 'interested', 'declined'] as const;

export const CompanyRecommendationsPage: React.FC = () => {
  const { companyId = '' } = useParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('all');
  const listQuery = useQuery({
    queryKey: ['company', companyId, 'recommendations'],
    queryFn: () => recommendationsApi.employerList(companyId),
    enabled: Boolean(companyId),
  });
  const all = useMemo(() => [...(listQuery.data ?? [])].sort((a, b) =>
    (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [listQuery.data]);
  const term = search.trim().toLocaleLowerCase();
  const matching = all.filter((item) => [item.candidate.user.firstName, item.candidate.user.lastName,
    item.candidate.headline, item.candidate.city, item.job?.title].filter(Boolean).join(' ').toLocaleLowerCase().includes(term));
  const visible = matching.filter((item) => status === 'all' || item.status === status);
  const reset = () => { setSearch(''); setStatus('all'); };

  return (
    <div className="company-recommendation-shell company-recommendations-page">
      <header className="rec-page-head">
        <span className="section-eyebrow">From Progress</span>
        <h1>Recommended candidates</h1>
        <p className="muted rec-page-sub">Candidates the Progress team selected for your company.</p>
      </header>
      {listQuery.isError && <div className="record-error" role="alert">
        <h2>Could not load recommendations</h2><p>{(listQuery.error as Error).message}</p>
        <button type="button" className="rec-btn rec-btn-soft" disabled={listQuery.isFetching} onClick={() => void listQuery.refetch()}>{listQuery.isFetching ? 'Trying again…' : 'Try again'}</button>
      </div>}
      {(listQuery.isSuccess || all.length > 0) && <div className="recommendation-finder">
        <label htmlFor="recommendation-search">Find a candidate</label>
        <div className="recommendation-search-row"><input id="recommendation-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, profession, job or location" />
          {search && <button type="button" className="rec-btn rec-btn-soft" onClick={() => setSearch('')}>Clear search</button>}
        </div>
        <div className="record-section-nav" role="group" aria-label="Recommendation status">
          {FILTERS.map((filter) => <button key={filter} type="button" aria-pressed={status === filter} onClick={() => setStatus(filter)}>
            {filter === 'all' ? 'All' : recommendationStatus(filter)} <span>{filter === 'all' ? matching.length : matching.filter((item) => item.status === filter).length}</span>
          </button>)}
        </div>
        <p className="recommendation-result-count" role="status">{visible.length} of {all.length} recommendations · Newest first</p>
      </div>}
      <div className="rec-list">
        {visible.map((item) => {
          const name = `${item.candidate.user.firstName} ${item.candidate.user.lastName}`;
          return (
            <article className="rec-list-card" key={item.id}>
              <div className="rec-list-main">
                <h2>{name}</h2>
                <p className="rec-list-meta">{item.candidate.headline || 'Profile'}</p>
                {item.job && <p className="rec-list-job"><span>Suggested job:</span> {item.job.title}</p>}
                <p className="rec-list-context">{item.candidate.city && <span>{item.candidate.city}</span>}<time dateTime={item.createdAt}>Recommended {candidateDate(item.createdAt)}</time></p>
                <p className="rec-list-type muted">{item.candidate.source === 'office' ? 'Office registration' : 'Online profile'}</p>
                {item.note && (item.note.length > 180 ? <details className="rec-list-note rec-expandable-note"><summary><span className="rec-note-preview">{item.note}</span><span className="rec-note-open">Read full note</span><span className="rec-note-close">Hide note</span></summary><p>{item.note}</p></details> : <p className="rec-list-note">{item.note}</p>)}
              </div>
              <span className={`rec-status-pill is-${item.status}`}>{recommendationStatus(item.status)}</span>
              <Link className="rec-btn rec-btn-soft" to={`/company/${companyId}/recommendations/${item.id}`}>Open profile</Link>
            </article>
          );
        })}
        {listQuery.isLoading && <div className="rec-empty" role="status">Loading recommendations…</div>}
        {listQuery.isSuccess && visible.length === 0 && <div className="rec-empty">
          <h2>{all.length === 0 ? 'No recommendations yet' : 'No matching candidates'}</h2>
          <p>{all.length === 0 ? 'Candidates recommended by Progress will appear here.' : 'Try another name, job, location or status.'}</p>
          {(search || status !== 'all') && <button type="button" className="rec-btn rec-btn-soft" onClick={reset}>Reset search and filters</button>}
        </div>}
      </div>
    </div>
  );
};
