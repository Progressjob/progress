import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';

export const EmployerJobsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const companiesQuery = useQuery({
    queryKey: ['employer', 'companies'],
    queryFn: () => employerApi.listCompanies(),
  });

  const companyQuery = useQuery({
    queryKey: ['employer', 'company', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobsQuery = useQuery({
    queryKey: ['employer', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId),
  });

  const companies = companiesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  const totalApplications = jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0);
  const totalViews = jobs.reduce((acc, j) => acc + (j._count?.views ?? 0), 0);

  return (
    <div className="jobs-list-container">
      {/* Header */}
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="section-eyebrow">Employer Recruitment Portal</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
              {companyQuery.data?.name ?? 'Enterprise'} — Active Campaigns
            </h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              Review your posted job advertisements, track live impressions, and evaluate submitted candidate CVs.
            </p>
          </div>

          {companies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Switch Company:</span>
              <select
                value={companyId}
                onChange={(e) => navigate(`/employer/${e.target.value}/jobs`)}
                style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card">
          <span className="stat-number">{jobs.length}</span>
          <span className="stat-label">Total Job Campaigns</span>
          <span className="stat-desc">Published and active advertisements</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalApplications}</span>
          <span className="stat-label">Total Candidate Applications</span>
          <span className="stat-desc">Submitted across all positions</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalViews}</span>
          <span className="stat-label">Vacancy Views</span>
          <span className="stat-desc">Candidate impressions</span>
        </div>
      </div>

      {jobsQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {jobsQuery.isError && (
        <div className="alert-box-error">
          Failed to load employer vacancies: {(jobsQuery.error as Error).message}
        </div>
      )}

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">📢</div>
          <h3>No Job Advertisements Yet</h3>
          <p>
            Contact Progress Manpower PLC to configure and publish new talent advertisements for your facility.
          </p>
          <Link to="/contact" className="btn-nav-register">
            Contact Progress Dukem HQ
          </Link>
        </div>
      )}

      {/* Vacancy Management Table */}
      {jobs.length > 0 && (
        <div className="jobs-filter-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Position Title</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Closing Date</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Applicants</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Candidate Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#0a2540' }}>{job.title}</strong>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                      {job.employmentType.replace('_', ' ')} • {job.workplaceType.replace('_', ' ')}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      className="tag-pill"
                      style={{
                        background: job.status === 'published' ? '#dcfce7' : '#fef3c7',
                        color: job.status === 'published' ? '#15803d' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      ● {job.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                    {new Date(job.applicationDeadline).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
                      {job._count?.applications ?? 0}
                    </strong>{' '}
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>candidates</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link
                      to={`/employer/${companyId}/jobs/${job.id}/applications`}
                      className="btn-card-apply"
                    >
                      <span>Review Pipeline ({job._count?.applications ?? 0})</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </Link>
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
