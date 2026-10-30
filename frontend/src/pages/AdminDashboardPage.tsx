import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';

const Arrow = () => <span aria-hidden="true">↗</span>;

export const AdminDashboardPage: React.FC = () => {
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => adminApi.dashboard() });
  const d = query.data;
  const stats = d ? [
    { label: 'Companies', value: d.companies, detail: 'Registered organizations', href: '/admin/companies', icon: '▥' },
    { label: 'Job postings', value: d.jobs, detail: 'Across all posting statuses', href: '/admin/jobs', icon: '▤' },
    { label: 'Published jobs', value: d.publishedJobs, detail: 'Currently marked as published', href: '/admin/jobs?status=published', icon: '↗' },
    { label: 'Awaiting job review', value: d.pendingReviewJobs, detail: 'Submitted for your approval', href: '/admin/jobs?status=pending_review', icon: '◷', attention: true },
    { label: 'Candidates', value: d.registeredCandidates ?? d.candidates, detail: 'Registered candidate profiles', href: '/admin/candidates', icon: '♙' },
    { label: 'Applications', value: d.applications, detail: 'Total applications submitted', icon: '▧' },
  ] : [];

  return <div className="admin-overview">
    <header className="admin-overview-header">
      <div>
        <span className="section-eyebrow">Platform overview</span>
        <h1>Admin dashboard</h1>
        <p>Monitor activity, review submissions, and keep opportunities moving.</p>
      </div>
      <button type="button" className="page-back-button" disabled={query.isFetching} onClick={() => void query.refetch()}>
        <span aria-hidden="true">↻</span> {query.isFetching ? 'Refreshing…' : 'Refresh overview'}
      </button>
    </header>

    {query.isError && <div className="alert-box-error" role="alert">Could not refresh dashboard data. Use Refresh overview to try again.</div>}
    {query.isLoading ? <div className="admin-metrics" aria-label="Loading dashboard" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="admin-metric admin-metric-skeleton" />)}
    </div> : d && <>
      <div className="admin-metrics">
        {stats.map((stat) => {
          const content = <>
            <div className="admin-metric-top"><span>{stat.label}</span><span className="admin-metric-icon" aria-hidden="true">{stat.icon}</span></div>
            <strong>{stat.value.toLocaleString()}</strong>
            <div className="admin-metric-bottom"><span>{stat.detail}</span>{stat.href && <Arrow />}</div>
          </>;
          const className = `admin-metric${stat.attention && stat.value > 0 ? ' needs-review' : ''}`;
          return stat.href ? <Link key={stat.label} to={stat.href} className={className}>{content}</Link>
            : <div key={stat.label} className={className}>{content}</div>;
        })}
      </div>

      <div className="admin-workspace-grid">
        <section className="admin-overview-panel">
          <div className="admin-panel-heading"><div><h2>Review & approve</h2><p>Keep company verification and job approvals up to date.</p></div><span className="admin-panel-mark" aria-hidden="true">✓</span></div>
          <Link className="admin-action-row" to="/admin/verification">
            <span className="admin-action-icon" aria-hidden="true">▥</span>
            <span><strong>Company verification</strong><small>Review business licences and approve employer access.</small></span><Arrow />
          </Link>
          <Link className="admin-action-row" to="/admin/jobs?status=pending_review">
            <span className="admin-action-icon" aria-hidden="true">◷</span>
            <span><strong>Job approval queue <span className="admin-count-badge">{d.pendingReviewJobs}</span></strong><small>{d.pendingReviewJobs ? 'Check submitted vacancies before they go live.' : 'No job postings are waiting for review.'}</small></span><Arrow />
          </Link>
          <p className="admin-review-note">Company approval enables job posting. Direct publishing is a separate permission.</p>
        </section>
        <section className="admin-overview-panel">
          <div className="admin-panel-heading"><div><h2>Manage your platform</h2><p>Go straight to the tools you use most.</p></div></div>
          <Link className="admin-action-row" to="/admin/jobs"><span><strong>Manage vacancies</strong><small>Create, edit, and monitor job postings.</small></span><Arrow /></Link>
          <Link className="admin-action-row" to="/admin/candidates"><span><strong>Candidate accounts</strong><small>Review profiles and application activity.</small></span><Arrow /></Link>
          <Link className="admin-action-row" to="/admin/support"><span><strong>Support inbox</strong><small>Respond to enquiries and manage reported jobs.</small></span><Arrow /></Link>
          <Link className="admin-action-row" to="/admin/cv-search"><span><strong>Search candidate CVs</strong><small>Find talent by profession and experience.</small></span><Arrow /></Link>
        </section>
      </div>
    </>}
  </div>;
};
