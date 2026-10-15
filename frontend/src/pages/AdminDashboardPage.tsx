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
        <h1>Admin Dashboard</h1>
        <p className="muted">Platform-wide metrics from GET /api/v1/admin/dashboard</p>
      </div>

      <div className="grid-stats">
        <div className="card stat-card">
          <span className="stat-label">Companies</span>
          <strong className="stat-value">{d.companies}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Total Jobs</span>
          <strong className="stat-value">{d.jobs}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Candidates</span>
          <strong className="stat-value">{d.candidates}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Applications</span>
          <strong className="stat-value">{d.applications}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Pending Reports</span>
          <strong className="stat-value">{d.pendingReports}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Quick Admin Actions</h3>
        <Link to="/admin/jobs" className="btn">
          Manage & Publish Jobs →
        </Link>
      </div>
    </div>
  );
};
