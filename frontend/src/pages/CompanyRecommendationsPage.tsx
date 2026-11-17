import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendations';

export const CompanyRecommendationsPage: React.FC = () => {
  const { companyId = '' } = useParams();
  const listQuery = useQuery({
    queryKey: ['company', companyId, 'recommendations'],
    queryFn: () => recommendationsApi.employerList(companyId),
    enabled: Boolean(companyId),
  });

  return (
    <div className="company-recommendation-shell company-recommendations-page">
      <header className="rec-page-head">
        <span className="section-eyebrow">From Progress</span>
        <h1>Recommended candidates</h1>
        <p className="muted rec-page-sub">Candidates the Progress team selected for your company.</p>
      </header>
      {listQuery.isError && <div className="alert-box-error">{(listQuery.error as Error).message}</div>}
      <div className="rec-list">
        {(listQuery.data ?? []).map((item) => {
          const name = `${item.candidate.user.firstName} ${item.candidate.user.lastName}`;
          const statusLabel = item.status.replace(/_/g, ' ');
          return (
            <article className="rec-list-card" key={item.id}>
              <div className="rec-list-main">
                <h2>{name}</h2>
                <p className="rec-list-meta">
                  {item.candidate.headline || 'Profile'}
                  {item.job ? ` · ${item.job.title}` : ''}
                </p>
                <p className="rec-list-type muted">
                  {item.candidate.source === 'office' ? 'Office registration' : 'Online profile'}
                </p>
                {item.note ? <p className="rec-list-note">{item.note}</p> : null}
              </div>
              <span className={`rec-status-pill is-${item.status}`}>{statusLabel}</span>
              <Link className="rec-btn rec-btn-soft" to={`/company/${companyId}/recommendations/${item.id}`}>
                Open
              </Link>
            </article>
          );
        })}
        {!listQuery.isLoading && !(listQuery.data ?? []).length && (
          <div className="rec-empty">No recommendations yet.</div>
        )}
      </div>
    </div>
  );
};
