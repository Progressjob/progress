import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';

export const CompaniesListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const companiesQuery = useQuery({
    queryKey: ['companies', page, limit],
    queryFn: () => companiesApi.list(page, limit),
  });

  const companies = companiesQuery.data ?? [];

  return (
    <div>
      <div className="page-header">
        <h1>Verified Companies Directory</h1>
        <p className="muted">Browse verified employers and their open positions.</p>
      </div>

      {companiesQuery.isLoading && <div className="card">Loading companies...</div>}
      {companiesQuery.isError && (
        <div className="card alert-error">
          Failed to load companies: {(companiesQuery.error as Error).message}
        </div>
      )}

      {!companiesQuery.isLoading && companies.length === 0 && (
        <div className="card">No verified companies found.</div>
      )}

      <div className="grid-cards">
        {companies.map((c) => (
          <div key={c.id} className="card">
            <h3>
              <Link to={`/companies/${c.slug}`}>{c.name}</Link>
            </h3>
            <p className="muted">
              {c.industry?.name ?? 'General Industry'}
              {c.city ? ` • ${c.city}` : ''}
            </p>
            {c.description && <p className="clamp-2">{c.description}</p>}
            <div className="job-card-footer">
              <span className="badge badge-outline">
                Jobs: {c._count?.jobs ?? 0}
              </span>
              <Link to={`/companies/${c.slug}`} className="btn btn-sm btn-secondary">
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={companies.length < limit}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
