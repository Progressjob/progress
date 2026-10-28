import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';

export const AdminDashboardPage: React.FC = () => {
  const dashQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
  });

  if (dashQuery.isLoading) {
    return <div className="card">Loading admin dashboard...</div>;
  }

  if (dashQuery.isError || !dashQuery.data) {
    return (
      <div className="card alert-error">
        Failed to load dashboard: {(dashQuery.error as Error)?.message}
      </div>
    );
  }

  const d = dashQuery.data;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Admin dashboard</h1>
        <p className="muted">Platform activity: companies, jobs, and registered candidates.</p>
      </div>

      <div className="grid-stats">
        <div className="card stat-card">
          <span className="stat-label">Companies</span>
          <strong className="stat-value">{d.companies}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Job postings</span>
          <strong className="stat-value">{d.jobs}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Published live</span>
          <strong className="stat-value">{d.publishedJobs}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Pending review</span>
          <strong className="stat-value">{d.pendingReviewJobs}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Registered candidates</span>
          <strong className="stat-value">{d.registeredCandidates ?? d.candidates}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Applications</span>
          <strong className="stat-value">{d.applications}</strong>
        </div>
      </div>

      <div className="card stack">
        <h3>Quick actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/companies" className="btn">
            Manage companies →
          </Link>
          <Link to="/admin/jobs?status=pending_review" className="btn">
            Jobs & review queue →
          </Link>
          <Link to="/admin/candidates" className="btn">
            View candidates →
          </Link>
        </div>
      </div>
    </div>
  );
};
