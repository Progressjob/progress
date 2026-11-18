import { recommendationStatus } from '../utils/candidatePresentation';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendations';
import { BackButton } from '../components/BackButton';
import { OfficeRegistryReadout } from '../components/recommendations/OfficeRegistryReadout';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const CompanyRecommendationDetailPage: React.FC = () => {
  const { companyId = '', id = '' } = useParams();
  const detailQuery = useQuery({
    queryKey: ['company', companyId, 'recommendation', id],
    queryFn: () => recommendationsApi.employerDetail(companyId, id),
    enabled: Boolean(companyId && id),
  });

  const detail = detailQuery.data;
  if (detailQuery.isLoading) {
    return (
      <div className="company-recommendation-shell">
        <BackButton fallback={`/company/${companyId}/recommendations`} /><div className="rec-panel" role="status">Loading recommendation…</div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="company-recommendation-shell">
        <BackButton fallback={`/company/${companyId}/recommendations`} />
        <div className="record-error" role="alert"><h1>Profile unavailable</h1><p>{(detailQuery.error as Error)?.message || 'This recommendation could not be found.'}</p><button type="button" className="rec-btn rec-btn-soft" disabled={detailQuery.isFetching} onClick={() => void detailQuery.refetch()}>{detailQuery.isFetching ? 'Trying again…' : 'Try again'}</button></div>
      </div>
    );
  }
  const profile = detail.profile;
  const isOffice = profile.source === 'office' || Boolean(detail.registry);
  const progressBy = detail.recommendedBy
    ? `${detail.recommendedBy.firstName} ${detail.recommendedBy.lastName}`.trim()
    : 'Progress team';
  const candidateName = `${profile.firstName} ${profile.lastName}`
    .trim()
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

  return (
    <div className="company-recommendation-shell company-recommendation-detail">
      <BackButton fallback={`/company/${companyId}/recommendations`} />

      <header className="rec-page-head">
        <span className="section-eyebrow">Progress candidate recommendation</span>
        <div className="rec-page-title-row">
          <h1>{candidateName}</h1>
          <span className={`rec-status-pill is-${detail.status}`}>
            {recommendationStatus(detail.status)}
          </span>
        </div>
        <p className="muted rec-page-sub">
          {profile.headline || profile.currentTitle || 'Candidate'}
        </p>
      </header>

      <nav className="record-section-nav" aria-label="Recommendation sections"><a href="#recommendation-overview">Recommendation</a><a href="#recommended-profile">Profile</a>{isOffice && detail.registry && <><a href="#recommendation-cv">CV</a><a href="#recommendation-contact">Contact Progress</a></>}</nav>
      <section id="recommendation-overview" className="rec-panel rec-progress-card" aria-labelledby="rec-progress-heading">
        <h2 className="rec-panel-title" id="rec-progress-heading">
          Why Progress recommends them
        </h2>
        <p className="rec-progress-meta muted">
          From {progressBy}
          {detail.createdAt ? ` · ${formatWhen(detail.createdAt)}` : ''}
        </p>
        {detail.note ? (
          <p className="rec-progress-note">{detail.note}</p>
        ) : (
          <p className="muted">No additional note was added for this recommendation.</p>
        )}
        {detail.job ? (
          <p className="rec-progress-job">
            <strong>Suggested job:</strong> {detail.job.title}
          </p>
        ) : null}
      </section>

      {isOffice && detail.registry ? (
        <section id="recommended-profile" className="rec-panel" aria-labelledby="rec-office-heading">
          <h2 className="rec-panel-title" id="rec-office-heading">
            Profile
          </h2>
          <OfficeRegistryReadout profile={profile} registry={detail.registry} />
        </section>
      ) : (
        <section id="recommended-profile" className="rec-panel" aria-labelledby="rec-online-heading">
          <h2 className="rec-panel-title" id="rec-online-heading">
            Online candidate profile
          </h2>
          <p className="muted rec-online-lead">
            This candidate registered on Progress Jobs. Open their full CV profile for education, experience, skills,
            and contact details.
          </p>
          <dl className="rec-facts-grid">
            <div className="rec-fact-cell">
              <dt>Headline</dt>
              <dd>{profile.headline || profile.currentTitle || '—'}</dd>
            </div>
            <div className="rec-fact-cell">
              <dt>Location</dt>
              <dd>{[profile.city, profile.region, profile.country].filter(Boolean).join(', ') || '—'}</dd>
            </div>
            <div className="rec-fact-cell">
              <dt>Availability</dt>
              <dd>{profile.availabilityStatus?.replace(/_/g, ' ') || '—'}</dd>
            </div>
          </dl>
          <div className="rec-inline-cta">
            <Link className="rec-btn rec-btn-primary" to={`/company/${companyId}/cv-search/${profile.id}`}>
              View full profile
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};