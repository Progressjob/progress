import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';
import { CompanyDirectoryCard } from '../components/CompanyDirectoryCard';
import { CompanyOverview } from '../components/CompanyOverview';

export const CompanyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const companyQuery = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.detail(slug!),
    enabled: Boolean(slug),
  });

  const company = companyQuery.data;
  const relatedQuery = useQuery({
    queryKey: ['companies', 'related', company?.industryId, company?.id],
    queryFn: () =>
      companiesApi.list(1, 6, {
        industryId: company!.industryId!,
        excludeId: company!.id,
      }),
    enabled: Boolean(company?.industryId && company?.id),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '320px' }} />
      </div>
    );
  }

  if (companyQuery.isError || !company) {
    return (
      <div className="jobs-list-container">
        <div className="alert-box-error">
          <h2>Employer profile not found</h2>
          <p>{(companyQuery.error as Error)?.message || 'Unable to locate this company profile.'}</p>
          <Link to="/jobs" className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            ← Back to vacancies
          </Link>
        </div>
      </div>
    );
  }

  const related = relatedQuery.data ?? [];

  return (
    <div className="jobs-list-container">
      <CompanyOverview company={company} showBreadcrumbs>
        {related.length > 0 && (
          <section className="co-related" aria-label={`More employers in ${company.industry?.name ?? 'this industry'}`}>
            <div className="co-related-head">
              <p className="jb-kicker">Same industry</p>
              <h2 className="co-related-title">More in {company.industry?.name ?? 'this industry'}</h2>
              <p className="co-related-copy">Other verified employers hiring in this industry.</p>
            </div>
            <div className="companies-grid">
              {related.map((peer) => (
                <CompanyDirectoryCard key={peer.id} company={peer} />
              ))}
            </div>
          </section>
        )}
      </CompanyOverview>
    </div>
  );
};
