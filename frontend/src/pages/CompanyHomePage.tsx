import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { CompanyLogoMark } from '../components/CompanyLogoMark';

export const CompanyHomePage: React.FC = () => {
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
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '300px' }} />
      </div>
    );
  }

  if (companiesQuery.isError) {
    const msg = (companiesQuery.error as Error).message;
    const suspended =
      msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('administrator');
    return (
        <div className="jobs-list-container">
          <div className="alert-box-error">
            <h2>{suspended ? 'Employer Portal Access Suspended' : 'Could Not Load Organizations'}</h2>
            <p>
              {suspended
                ? 'Your organization’s portal access has been suspended. Please contact Progress Jobs administration at Bishoftu HQ to restore access.'
                : msg}
            </p>
          </div>
        </div>
        );
  }

        const companies = companiesQuery.data ?? [];

        return (
              <div className="jobs-list-container">
                <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
                  <span className="section-eyebrow">Employer Hub</span>
                  <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
                    Employer Organizations
                  </h1>
                  <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
                    Select or manage your hiring profile ({companies.length} organization{companies.length === 1 ? '' : 's'}).
                  </p>
                </div>

                {companies.length === 0 ? (
                      <div className="empty-results-box">
                        <div className="empty-icon-circle">🏢</div>
                        <h3>No hiring organization set up</h3>
                        <p>Set up who is hiring, then post a job or search candidate CVs directly from this account.</p>
                        <Link to="/employer/setup" className="btn-nav-register" style={{ marginTop: '0.75rem' }}>
                          Set Up Employer Profile →
                        </Link>
                      </div>
                      ) : (
                              <div className="companies-grid">
                                {companies.map((c) => {
                                  return (
                                    <div key={c.id} className="company-directory-card">
                                      <div className="company-card-top">
                                        <div className="company-avatar-box">
                                          <CompanyLogoMark
                                            name={c.name}
                                            logoId={c.logo?.id ?? c.logoFileId}
                                            imgClassName="company-logo-img"
                                          />
                                        </div>
                                        <div className="company-card-headings">
                                          <span className="verified-badge">
                                            {c.verificationStatus === 'verified' ? '✓ Verified Partner' : 'Registered Organization'}
                                          </span>
                                          <h3 className="company-title">{c.name}</h3>
                                        </div>
                                      </div>

                                      <div className="company-tags-row">
                                        <span className="tag-pill tag-category">{c.industry?.name ?? 'Industry'}</span>
                                        {c.canSelfPublishJobs && c.verificationStatus === 'verified' ? (
                                          <span className="tag-pill tag-type">Direct Publishing</span>
                                        ) : (
                                          <span className="tag-pill">Waiting for admin review</span>
                                        )}
                                      </div>

                                      <div className="company-card-bottom" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                        <Link to={`/company/${c.id}/jobs`} className="btn-view-company-roles">
                                          <span>Manage Postings</span>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" />
                                          </svg>
                                        </Link>
                                        <Link to={`/company/${c.id}/profile`} className="btn btn-sm btn-secondary">
                                          Profile
                                        </Link>
                                        <Link to={`/company/${c.id}/cv-search`} className="btn btn-sm btn-secondary">
                                          CV Search
                                        </Link>
                                      </div>
                                    </div>
                              );
          })}
                            </div>
      )}
                          </div>
                        );
};
