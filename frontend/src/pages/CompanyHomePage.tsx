import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { useAuth } from '../auth/AuthContext';

export const CompanyHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
  });

  useEffect(() => {
    if (companiesQuery.data && companiesQuery.data.length === 1) {
      navigate(`/company/${companiesQuery.data[0].id}/jobs`, { replace: true });
    }
  }, [companiesQuery.data, navigate]);

  if (companiesQuery.isLoading) {
    return <div className="card">Loading your companies...</div>;
  }

  if (companiesQuery.isError) {
    const msg = (companiesQuery.error as Error).message;
    const suspended =
      msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('administrator');
    return (
      <div className="card stack">
        <h2>{suspended ? 'Company access suspended' : 'Could not load companies'}</h2>
        <p className="muted">
          {suspended
            ? 'Your organization’s portal access has been suspended. Please contact the platform administrator to restore access.'
            : msg}
        </p>
      </div>
    );
  }

  const companies = companiesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Employer</h1>
        <p className="muted">
          Manage job postings (
          {user?.companyMemberships.length ?? 0} hiring profile
          {(user?.companyMemberships.length ?? 0) === 1 ? '' : 's'}).
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="card stack">
          <p>Set up who is hiring, then post a job from this same account.</p>
          <Link to="/employer/setup" className="btn btn-sm">
            Set up employer profile →
          </Link>
        </div>
      ) : (
        <div className="grid-cards">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <h3>{c.name}</h3>
              <p className="muted">
                {c.industry?.name ?? 'Industry'} • Verification: {c.verificationStatus}
                {c.canSelfPublishJobs ? ' • Direct posting enabled' : ' • Jobs reviewed by admin'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to={`/company/${c.id}/jobs`} className="btn btn-sm">
                  Job postings →
                </Link>
                <Link to={`/company/${c.id}/cv-search`} className="btn btn-sm btn-secondary">
                  CV search →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
