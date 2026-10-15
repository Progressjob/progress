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
    <div className="jobs-list-container">
      {/* Studio Header */}
      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="section-eyebrow">Enterprise Recruitment Hub</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>Job Advertisement Studio</h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              Publish verified company vacancies, manage hiring campaigns, and approve advertisements for Adama & Bishoftu.
            </p>
          </div>
          <button
            type="button"
            className="btn-nav-register"
            onClick={() => setShowCreate((v) => !v)}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            <span>{showCreate ? '✕ Close Studio' : '+ Post New Job Advertisement'}</span>
          </button>
        </div>
      </div>

      {actionError && <div className="alert-box-error">{actionError}</div>}

      {/* Creation Drawer / Form */}
      {showCreate && (
        <div className="jobs-filter-card" style={{ marginBottom: '2.5rem', border: '2px solid rgba(11, 87, 208, 0.3)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a2540', margin: '0 0 1.25rem' }}>
            Draft a New Job Advertisement
          </h2>

          <form onSubmit={handleCreate} className="contact-form-fields">
            <div className="form-row-two">
              <div className="form-input-group">
                <label htmlFor="adm-co">Target Hiring Organization *</label>
                <select
                  id="adm-co"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Partner Company --</option>
                  {(companiesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-input-group">
                <label htmlFor="adm-cat">Job Domain / Category *</label>
                <select
                  id="adm-cat"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
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

            <div className="form-row-two">
              <div className="form-input-group">
                <label htmlFor="adm-title">Job Advertisement Title *</label>
                <input
                  id="adm-title"
                  type="text"
                  required
                  placeholder="e.g. Senior Production Operations Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-input-group">
                <label htmlFor="adm-loc">Operating Location (Adama / Bishoftu Corridor)</label>
                <select
                  id="adm-loc"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Operating Region --</option>
                  {(locationsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.region ?? 'Ethiopia'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-input-group">
              <label htmlFor="adm-desc">Full Role Description & Requirements *</label>
              <textarea
                id="adm-desc"
                rows={4}
                required
                placeholder="Detailed description of responsibilities, technical skills, and candidate profile..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-row-two">
              <div className="form-input-group">
                <label htmlFor="adm-emp">Employment Model</label>
                <select
                  id="adm-emp"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div className="form-input-group">
                <label htmlFor="adm-work">Workplace Mode</label>
                <select
                  id="adm-work"
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                >
                  <option value="on_site">On-Site Facility</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Fully Remote</option>
                </select>
              </div>

              <div className="form-input-group">
                <label htmlFor="adm-method">Application Method</label>
                <select
                  id="adm-method"
                  value={applicationMethod}
                  onChange={(e) => setApplicationMethod(e.target.value as ApplicationMethod)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                >
                  <option value="internal">Internal Platform Submission</option>
                  <option value="external_url">External Company URL</option>
                  <option value="email">Direct Email Submission</option>
                </select>
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-input-group">
                <label htmlFor="adm-deadline">Application Closing Date *</label>
                <input
                  id="adm-deadline"
                  type="date"
                  required
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                />
              </div>

              <div className="form-input-group">
                <label htmlFor="adm-vac">Open Positions Count *</label>
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={createMutation.isPending}
                style={{ width: 'auto', padding: '0.85rem 2rem' }}
              >
                {createMutation.isPending ? 'Publishing Draft...' : 'Save & Prepare Advertisement →'}
              </button>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`pagination-btn ${tab === 'all' ? 'active' : ''}`}
          style={{
            background: tab === 'all' ? 'var(--primary)' : '#ffffff',
            color: tab === 'all' ? '#ffffff' : '#0f172a',
            fontWeight: 700,
          }}
        >
          Active Job Advertisements ({allJobsQuery.data?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`pagination-btn ${tab === 'pending' ? 'active' : ''}`}
          style={{
            background: tab === 'pending' ? 'var(--primary)' : '#ffffff',
            color: tab === 'pending' ? '#ffffff' : '#0f172a',
            fontWeight: 700,
          }}
        >
          Pending Review Queue ({pendingJobsQuery.data?.length ?? 0})
        </button>
      </div>

      {/* Jobs Campaign List */}
      <div className="jobs-board-grid">
        {jobs.map((job) => (
          <div key={job.id} className="premium-job-card">
            <div className="job-card-header">
              <div className="company-badge">
                {job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="job-card-meta">
                <span className="job-company-name">{job.company?.name ?? 'Partner Employer'}</span>
                <h3 className="job-card-title">
                  <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                </h3>
              </div>
            </div>

            <div className="job-card-tags">
              <span
                className="tag-pill"
                style={{
                  background:
                    job.status === 'published'
                      ? '#dcfce7'
                      : job.status === 'pending_review'
                        ? '#fef3c7'
                        : '#f1f5f9',
                  color:
                    job.status === 'published'
                      ? '#15803d'
                      : job.status === 'pending_review'
                        ? '#b45309'
                        : '#475569',
                  fontWeight: 700,
                }}
              >
                ● {job.status.toUpperCase()}
              </span>
              <span className="tag-pill tag-type">{job.employmentType.replace('_', ' ').toUpperCase()}</span>
              {job.location && <span className="tag-pill tag-location">{job.location.name}</span>}
            </div>

            <div className="job-card-footer" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <span className="job-deadline">
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {job.status !== 'published' && (
                  <button
                    type="button"
                    className="btn-card-apply"
                    style={{ background: '#16a34a', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                    onClick={() => publishMutation.mutate(job.id)}
                    disabled={publishMutation.isPending}
                  >
                    Publish Live ✓
                  </button>
                )}

                {job.status === 'published' && (
                  <button
                    type="button"
                    className="btn-clear-filters"
                    style={{ cursor: 'pointer' }}
                    onClick={() => closeMutation.mutate(job.id)}
                    disabled={closeMutation.isPending}
                  >
                    Close Vacancy
                  </button>
                )}

                <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                  View Public Ad →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
