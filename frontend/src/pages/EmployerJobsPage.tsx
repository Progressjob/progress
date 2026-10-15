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

  return (
    <div className="stack">
      <div className="job-card-header">
        <div>
          <h1>{companyQuery.data?.name ?? 'Company'} — Jobs</h1>
          <p className="muted">
            Company ID: <code>{companyId}</code> • Jobs are created/published by Admin.
          </p>
        </div>

        {companies.length > 1 && (
          <div className="field">
            <label htmlFor="emp-switch-co">Switch Company</label>
            <select
              id="emp-switch-co"
              value={companyId}
              onChange={(e) => navigate(`/employer/${e.target.value}/jobs`)}
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

      {jobsQuery.isLoading && <div className="card">Loading company jobs...</div>}
      {jobsQuery.isError && (
        <div className="card alert-error">
          Failed to load jobs: {(jobsQuery.error as Error).message}
        </div>
      )}

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <div className="card">No jobs posted for this company yet.</div>
      )}

      {jobs.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Views</th>
                <th>Applications</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.title}</strong>
                    <div>
                      <small className="muted">{job.slug}</small>
                    </div>
                  </td>
                  <td>
                    <span className="badge">{job.status}</span>
                  </td>
                  <td>{new Date(job.applicationDeadline).toLocaleDateString()}</td>
                  <td>{job._count?.views ?? 0}</td>
                  <td>
                    <strong>{job._count?.applications ?? 0}</strong>
                  </td>
                  <td>
                    <Link
                      to={`/employer/${companyId}/jobs/${job.id}/applications`}
                      className="btn btn-sm"
                    >
                      View Applicants ({job._count?.applications ?? 0})
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
