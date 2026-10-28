import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';

  const statusBadge = (status: string) => {
    if (status === 'published') {
      return <span className="status-badge status-published">● Published</span>;
    }
    if (status === 'pending_review') {
      return <span className="status-badge status-review">⏳ Under Review</span>;
    }
    if (status === 'rejected') {
      return <span className="status-badge status-rejected">✕ Rejected</span>;
    }
    if (status === 'draft') {
      return <span className="status-badge status-draft">Draft</span>;
    }
    return <span className="status-badge status-closed">{status.toUpperCase()}</span>;
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
    const publishedCount = jobs.filter((j) => j.status === 'published').length;
    const reviewCount = jobs.filter((j) => j.status === 'pending_review').length;

    return (
      <div className="jobs-list-container">
        {/* Header */}
        <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div className="company-portal-header-row">
              <div>
                <span className="section-eyebrow">Employer Portal</span>
                <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
                  {companyQuery.data?.name ?? 'Company'} — Job Postings
                </h1>
                <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
                  {companyQuery.data?.canSelfPublishJobs
                  ? 'Your organization is verified to publish vacancies directly to the board.'
                : 'New vacancies are reviewed by Progress Manpower administrators before going live.'}
                </p>
              </div>

                <div className="company-portal-actions">
                  {companies.length > 1 && (
                    <select
                      value={companyId}
                      onChange={(e) => navigate(`/company/${e.target.value}/jobs`)}
                      className="select-company-switcher"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Link to={`/company/${companyId}/jobs/new`} className="btn-nav-register">
                    + Post New Opportunity
                  </Link>
                </div>
              </div>
            </div>

                {/* Stats Row */}
                <div className="cv-stats-row" style={{ marginBottom: '2rem' }}>
                  <div className="cv-stat-box">
                    <span className="cv-stat-label">Total Postings</span>
                    <strong className="cv-stat-number">{jobs.length}</strong>
                    <span className="cv-stat-sub">All created vacancies</span>
                  </div>
                  <div className="cv-stat-box">
                    <span className="cv-stat-label">Published Live</span>
                    <strong className="cv-stat-number text-primary">{publishedCount}</strong>
                    <span className="cv-stat-sub">Visible to candidates</span>
                  </div>
                  <div className="cv-stat-box">
                    <span className="cv-stat-label">Under Review</span>
                    <strong className="cv-stat-number" style={{ color: '#d97706' }}>{reviewCount}</strong>
                    <span className="cv-stat-sub">Pending approval</span>
                  </div>
                </div>

                {jobsQuery.isLoading && (
                  <div className="jobs-loading-grid">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="job-card-skeleton" />
                    ))}
                  </div>
                )}

                {!jobsQuery.isLoading && jobs.length === 0 && (
                  <div className="empty-results-box">
                      <div className="empty-icon-circle">💼</div>
                      <h3>No job postings created yet</h3>
                      <p>Post your first employment opportunity to find qualified talent across Ethiopia.</p>
                      <Link to={`/company/${companyId}/jobs/new`} className="btn-nav-register" style={{ marginTop: '0.75rem' }}>
                        + Create First Job Posting
                      </Link>
                  </div>
                )}

                {/* Responsive Job List / Table */}
                {jobs.length > 0 && (
                                <div className="employer-jobs-panel">
                                  <div className="employer-jobs-list">
                                    {jobs.map((job) => (
                                      <div key={job.id} className="employer-job-row-card">
                                        <div className="emp-job-info">
                                          <div className="emp-job-title-row">
                                            <h3 className="emp-job-title">{job.title}</h3>
                                            {statusBadge(job.status)}
                                          </div>
                                          <div className="emp-job-meta">
                                            <span className="emp-meta-item">
                                              📅 Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                                            </span>
                                  <span className="emp-meta-item">
                                    💼 {job.employmentType.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {job.vacanciesCount > 1 && (
                                    <span className="emp-meta-item">👥 {job.vacanciesCount} Openings</span>
                                  )}
                                </div>
                              </div>

                              <div className="emp-job-actions">
                                {job.status === 'published' && (
                                  <Link to={`/jobs/${job.slug}`} className="btn btn-sm btn-secondary" target="_blank">
                                    View Public Post ↗
                                  </Link>
                                )}
                                {['draft', 'pending_review', 'rejected', 'published'].includes(job.status) ? (
                                  <Link
                                    to={`/company/${companyId}/jobs/${job.id}/edit`}
                                    className="btn btn-sm btn-primary"
                                  >
                                    Edit Post
                                  </Link>
                                ) : (
                                  <span className="muted">Closed</span>
                                )}
                              </div>
                            </div>
            ))}
                          </div>
        </div>
      )}
                  </div>
                );
};
