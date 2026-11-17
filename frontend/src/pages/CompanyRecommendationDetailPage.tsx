import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const detailQuery = useQuery({
    queryKey: ['company', companyId, 'recommendation', id],
    queryFn: () => recommendationsApi.employerDetail(companyId, id),
    enabled: Boolean(companyId && id),
  });
  const respond = useMutation({
    mutationFn: (status: 'interested' | 'declined') =>
      recommendationsApi.respond(companyId, id, { status, message: message.trim() || undefined }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['company', companyId, 'recommendation', id] });
      void client.invalidateQueries({ queryKey: ['company', companyId, 'recommendations'] });
    },
  });

  const detail = detailQuery.data;
  if (detailQuery.isLoading) {
    return (
      <div className="company-recommendation-shell">
        <div className="rec-panel">Loading recommendation…</div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="company-recommendation-shell">
        <div className="alert-box-error">{(detailQuery.error as Error)?.message || 'Not found'}</div>
      </div>
    );
  }
  const profile = detail.profile;
  const isOffice = profile.source === 'office' || Boolean(detail.registry);
  const progressBy = detail.recommendedBy
    ? `${detail.recommendedBy.firstName} ${detail.recommendedBy.lastName}`.trim()
    : 'Progress team';

  const statusLabel = detail.status.replace(/_/g, ' ');

  return (
    <div className="company-recommendation-shell company-recommendation-detail">
      <BackButton fallback={`/company/${companyId}/recommendations`} />

      <header className="rec-page-head">
        <span className="section-eyebrow">Progress candidate recommendation</span>
        <div className="rec-page-title-row">
          <h1>
            {profile.firstName} {profile.lastName}
          </h1>
          <span className={`rec-status-pill is-${detail.status}`}>{statusLabel}</span>
        </div>
        <p className="muted rec-page-sub">
          {profile.headline || profile.currentTitle || 'Candidate'}
          {isOffice ? ' · Office registration' : ' · Online profile'}
        </p>
      </header>

      <section className="rec-panel rec-progress-card" aria-labelledby="rec-progress-heading">
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
        <section className="rec-panel" aria-labelledby="rec-office-heading">
          <h2 className="rec-panel-title" id="rec-office-heading">
            Office registration details
          </h2>
          <OfficeRegistryReadout profile={profile} registry={detail.registry} />
        </section>
      ) : (
        <section className="rec-panel" aria-labelledby="rec-online-heading">
          <h2 className="rec-panel-title" id="rec-online-heading">
            Online candidate profile
          </h2>
          <p className="muted rec-online-lead">
            This candidate registered on Progress Jobs. Open their full CV profile for education, experience,
            skills, and contact details.
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

      <section className="rec-panel rec-response-panel">
        <h2 className="rec-panel-title">Your response</h2>
        {detail.employerResponse && (
          <p className="rec-last-reply">
            <strong>Last reply:</strong> {detail.employerResponse}
          </p>
        )}
        <label className="rec-field-label" htmlFor="rec-reply">
          Message to Progress
        </label>
        <textarea
          id="rec-reply"
          className="rec-textarea"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional note for the Progress team…"
        />
        {respond.isError && <div className="alert-box-error">{(respond.error as Error).message}</div>}
        <div className="rec-response-actions">
          <button
            type="button"
            className="rec-btn rec-btn-primary"
            disabled={respond.isPending}
            onClick={() => respond.mutate('interested')}
          >
            Interested
          </button>
          <button
            type="button"
            className="rec-btn rec-btn-danger"
            disabled={respond.isPending}
            onClick={() => respond.mutate('declined')}
          >
            Not suitable
          </button>
        </div>
      </section>
    </div>
  );
};