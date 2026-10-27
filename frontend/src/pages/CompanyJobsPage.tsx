import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';

const statusStyle = (status: string) => {
  if (status === 'published') return { background: '#dcfce7', color: '#15803d' };
  if (status === 'pending_review') return { background: '#fef3c7', color: '#b45309' };
  if (status === 'rejected') return { background: '#fee2e2', color: '#b91c1c' };
  return { background: '#f1f5f9', color: '#475569' };
};

export const CompanyJobsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
  });

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobsQuery = useQuery({
    queryKey: ['company', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId),
  });

  const companies = companiesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const totalApplications = jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0);

  return (
    <div className="jobs-list-container">
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span className="section-eyebrow">Employer</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
              {companyQuery.data?.name ?? 'Company'} — job postings
            </h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              {companyQuery.data?.canSelfPublishJobs
                ? 'You can publish jobs directly to the public board.'
                : 'New jobs are submitted for admin review before going live.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {companies.length > 1 && (
              <select
                value={companyId}
                onChange={(e) => navigate(`/company/${e.target.value}/jobs`)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Link to={`/company/${companyId}/jobs/new`} className="btn-nav-register">
              + Post opportunity
            </Link>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <span className="stat-number">{jobs.length}</span>
          <span className="stat-label">Job postings</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalApplications}</span>
          <span className="stat-label">Candidate applications</span>
        </div>
      </div>

      {jobsQuery.isLoading && <div className="card">Loading jobs...</div>}

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <div className="empty-results-box">
          <h3>No job postings yet</h3>
          <p>Create your first opportunity to start receiving candidate applications.</p>
          <Link to={`/company/${companyId}/jobs/new`} className="btn">
            Post opportunity
          </Link>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="jobs-filter-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Deadline</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Applicants</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{job.title}</strong>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className="tag-pill" style={{ ...statusStyle(job.status), fontWeight: 700 }}>
                      {job.status === 'pending_review' ? 'UNDER REVIEW' : job.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {new Date(job.applicationDeadline).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>{job._count?.applications ?? 0}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {job.status === 'published' ? (
                      <Link
                        to={`/company/${companyId}/jobs/${job.id}/applications`}
                        className="btn-card-apply"
                      >
                        View candidates ({job._count?.applications ?? 0})
                      </Link>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.85rem' }}>
                        {job.status === 'pending_review'
                          ? 'Waiting for admin approval'
                          : 'Not on public board yet'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
