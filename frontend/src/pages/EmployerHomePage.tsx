import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { useAuth } from '../auth/AuthContext';

export const EmployerHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const companiesQuery = useQuery({
    queryKey: ['employer', 'companies'],
    queryFn: () => employerApi.listCompanies(),
  });

  useEffect(() => {
    if (companiesQuery.data && companiesQuery.data.length === 1) {
      navigate(`/employer/${companiesQuery.data[0].id}/jobs`, { replace: true });
    }
  }, [companiesQuery.data, navigate]);

  if (companiesQuery.isLoading) {
    return <div className="card">Loading your company memberships...</div>;
  }

  if (companiesQuery.isError) {
    return (
      <div className="card alert-error">
        Failed to load employer companies: {(companiesQuery.error as Error).message}
      </div>
    );
  }

  const companies = companiesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Employer Portal — Select Company</h1>
        <p className="muted">
          Active memberships from <code>/auth/me</code>:{' '}
          {user?.companyMemberships.length ?? 0}
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="card">
          <p>Your employer account is not currently an active member of any company.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <h3>{c.name}</h3>
              <p className="muted">
                {c.industry?.name ?? 'Industry'} • Verification: {c.verificationStatus}
              </p>
              <Link to={`/employer/${c.id}/jobs`} className="btn btn-sm">
                Manage Jobs & Applicants →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
