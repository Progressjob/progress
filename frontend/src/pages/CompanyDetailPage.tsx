import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';
import { CompanyOverview } from '../components/CompanyOverview';

export const CompanyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const companyQuery = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.detail(slug!),
    enabled: Boolean(slug),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '320px' }} />
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
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

  return (
    <div className="jobs-list-container">
      <CompanyOverview company={companyQuery.data} showBreadcrumbs />
    </div>
  );
};
