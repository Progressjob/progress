import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';

export const CompanyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const companyQuery = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.detail(slug!),
    enabled: Boolean(slug),
  });

  if (companyQuery.isLoading) {
    return <div className="card">Loading company profile...</div>;
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <div className="card alert-error">
        <h2>Company Not Found</h2>
        <p>{(companyQuery.error as Error)?.message || 'Unable to load company.'}</p>
        <Link to="/companies" className="btn btn-sm">
          Back to Companies
        </Link>
      </div>
    );
  }

  const company = companyQuery.data;

  return (
    <div className="stack">
      <div>
        <Link to="/companies" className="muted">
          ← Back to Companies
        </Link>
      </div>

      <div className="card">
        <h1>{company.name}</h1>
        <p className="muted">
          {company.industry?.name}
          {company.city ? ` • ${company.city}` : ''}
          {company.region ? `, ${company.region}` : ''}
          {company.companySize ? ` • Size: ${company.companySize}` : ''}
        </p>

        {company.websiteUrl && (
          <p>
            Website:{' '}
            <a href={company.websiteUrl} target="_blank" rel="noreferrer">
              {company.websiteUrl}
            </a>
          </p>
        )}

        {company.description && <p className="prose">{company.description}</p>}
      </div>

      <div className="card">
        <h2>Open Published Positions ({company.jobs?.length ?? 0})</h2>
        {!company.jobs || company.jobs.length === 0 ? (
          <p className="muted">No active published jobs at this moment.</p>
        ) : (
          <div className="stack">
            {company.jobs.map((job) => (
              <div key={job.id} className="subcard">
                <div className="job-card-header">
                  <div>
                    <h3>
                      <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                    </h3>
                    <span className="muted">
                      Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="badges">
                    <span className="badge">{job.employmentType}</span>
                    <span className="badge badge-outline">{job.workplaceType}</span>
                    <Link to={`/jobs/${job.slug}`} className="btn btn-sm">
                      View Job
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
