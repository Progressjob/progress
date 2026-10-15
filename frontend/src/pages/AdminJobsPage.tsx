import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { taxonomyApi } from '../api/taxonomy';
import type { ApplicationMethod, EmploymentType, WorkplaceType } from '../types/api';

export const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const allJobsQuery = useQuery({
    queryKey: ['admin', 'jobs', 'all'],
    queryFn: () => adminApi.listJobs(),
  });

  const pendingJobsQuery = useQuery({
    queryKey: ['admin', 'jobs', 'pending'],
    queryFn: () => adminApi.listPendingJobs(),
  });

  const companiesQuery = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: () => adminApi.listCompanies(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const locationsQuery = useQuery({
    queryKey: ['taxonomy', 'locations'],
    queryFn: () => taxonomyApi.locations(),
  });

  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('on_site');
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>('internal');
  const [applicationDeadline, setApplicationDeadline] = useState('2026-12-31');
  const [vacanciesCount, setVacanciesCount] = useState(1);

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createJob({
        companyId,
        categoryId,
        locationId: locationId || undefined,
        title,
        description,
        employmentType,
        workplaceType,
        applicationMethod,
        applicationDeadline,
        vacanciesCount: Number(vacanciesCount) || 1,
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setShowCreate(false);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishJob(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => adminApi.closeJob(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const jobs = tab === 'all' ? (allJobsQuery.data ?? []) : (pendingJobsQuery.data ?? []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    createMutation.mutate();
  };

  return (
    <div className="stack">
      <div className="job-card-header">
        <div>
          <h1>Admin Job Management</h1>
          <p className="muted">Create draft jobs and publish them to the public job board.</p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancel New Job' : '+ Create Draft Job'}
        </button>
      </div>

      {actionError && <div className="card alert-error">{actionError}</div>}

      {showCreate && (
        <div className="card">
          <h3>Create New Job (Draft)</h3>
          <form onSubmit={handleCreate} className="stack">
            <div className="grid-two">
              <div className="field">
                <label htmlFor="adm-co">Company *</label>
                <select
                  id="adm-co"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">-- Select Company --</option>
                  {(companiesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="adm-cat">Category *</label>
                <select
                  id="adm-cat"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-two">
              <div className="field">
                <label htmlFor="adm-loc">Location</label>
                <select
                  id="adm-loc"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">-- Optional Location --</option>
                  {(locationsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="adm-title">Job Title *</label>
                <input
                  id="adm-title"
                  type="text"
                  required
                  placeholder="e.g. Senior React Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="adm-desc">Description *</label>
              <textarea
                id="adm-desc"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid-filters">
              <div className="field">
                <label htmlFor="adm-emp">Employment Type</label>
                <select
                  id="adm-emp"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                >
                  <option value="full_time">full_time</option>
                  <option value="part_time">part_time</option>
                  <option value="contract">contract</option>
                  <option value="internship">internship</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="adm-work">Workplace Type</label>
                <select
                  id="adm-work"
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                >
                  <option value="on_site">on_site</option>
                  <option value="hybrid">hybrid</option>
                  <option value="remote">remote</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="adm-method">Application Method</label>
                <select
                  id="adm-method"
                  value={applicationMethod}
                  onChange={(e) => setApplicationMethod(e.target.value as ApplicationMethod)}
                >
                  <option value="internal">internal</option>
                  <option value="external_url">external_url</option>
                  <option value="email">email</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="adm-deadline">Deadline *</label>
                <input
                  id="adm-deadline"
                  type="date"
                  required
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="adm-vac">Vacancies *</label>
                <input
                  id="adm-vac"
                  type="number"
                  min={1}
                  required
                  value={vacanciesCount}
                  onChange={(e) => setVacanciesCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <button type="submit" className="btn" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating Draft...' : 'Save Draft Job'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tabs">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'all' ? '' : 'btn-secondary'}`}
          onClick={() => setTab('all')}
        >
          All Jobs ({allJobsQuery.data?.length ?? 0})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'pending' ? '' : 'btn-secondary'}`}
          onClick={() => setTab('pending')}
        >
          Pending Review ({pendingJobsQuery.data?.length ?? 0})
        </button>
      </div>

      <div className="card">
        {allJobsQuery.isLoading && <p>Loading jobs...</p>}
        {!allJobsQuery.isLoading && jobs.length === 0 && (
          <p className="muted">No jobs in this view.</p>
        )}

        {jobs.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    {job.status === 'published' ? (
                      <Link to={`/jobs/${job.slug}`}>
                        <strong>{job.title}</strong>
                      </Link>
                    ) : (
                      <strong>{job.title}</strong>
                    )}
                    <div>
                      <small className="muted">{job.slug}</small>
                    </div>
                  </td>
                  <td>{job.company?.name ?? job.companyId}</td>
                  <td>
                    <span
                      className={`badge ${
                        job.status === 'published' ? 'badge-success' : 'badge-outline'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td>{new Date(job.applicationDeadline).toLocaleDateString()}</td>
                  <td className="row-actions">
                    {(job.status === 'draft' ||
                      job.status === 'pending_review' ||
                      job.status === 'closed') && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(job.id)}
                      >
                        Publish
                      </button>
                    )}
                    {job.status === 'published' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={closeMutation.isPending}
                        onClick={() => closeMutation.mutate(job.id)}
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
