import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { CompanyPayload, CreateAdminJobPayload } from '../api/admin';
import { AdminCredentialsModal } from '../components/admin/AdminCredentialsModal';
import { AdminJobFormFields } from '../components/admin/AdminJobFormFields';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { EmployerCredentialsFields } from '../components/admin/EmployerCredentialsFields';
import {
  emptyAdminJobForm,
  emptyCompanyForm,
  emptyEmployerForm,
  sanitizeCompanyPayload,
  sanitizeJobPayload,
} from '../components/admin/adminFormUtils';
import type { Company } from '../types/api';

export const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | 'pending'>('pending');
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState<string | null>(null);

  const [postMode, setPostMode] = useState<'existing' | 'new'>('existing');
  const [companyPickerSearch, setCompanyPickerSearch] = useState('');
  const [newCompanyForm, setNewCompanyForm] = useState<CompanyPayload>(emptyCompanyForm());
  const [newEmployerForm, setNewEmployerForm] = useState(emptyEmployerForm());
  const [newCompanyCanPost, setNewCompanyCanPost] = useState(false);
  const [publishAfterCreate, setPublishAfterCreate] = useState(true);

  const [jobForm, setJobForm] = useState<CreateAdminJobPayload>(emptyAdminJobForm());
  const [credentials, setCredentials] = useState<{ email: string; temporaryPassword: string } | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const searchQ = debouncedSearch || undefined;

  const allJobsQuery = useQuery({
    queryKey: ['admin', 'jobs', 'all', searchQ],
    queryFn: () => adminApi.listJobs(searchQ),
  });

  const pendingJobsQuery = useQuery({
    queryKey: ['admin', 'jobs', 'pending', searchQ],
    queryFn: () => adminApi.listPendingJobs(searchQ),
  });

  const companiesQuery = useQuery({
    queryKey: ['admin', 'companies', searchQ],
    queryFn: () => adminApi.listCompanies(searchQ),
  });

  const pickerCompaniesQuery = useQuery({
    queryKey: ['admin', 'companies', 'picker', companyPickerSearch],
    queryFn: () => adminApi.listCompanies(companyPickerSearch || undefined),
    enabled: showCreate && postMode === 'existing',
  });

  const invalidateJobs = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let companyId = jobForm.companyId;
      if (postMode === 'new') {
        const provisioned = await adminApi.provisionCompany({
          company: sanitizeCompanyPayload(newCompanyForm),
          employer: newEmployerForm,
          verify: true,
          canSelfPublishJobs: newCompanyCanPost,
        });
        companyId = provisioned.company.id;
        setCredentials(provisioned.credentials);
      }
      if (!companyId) throw new Error('Select a company');
      const job = await adminApi.createJob(sanitizeJobPayload({ ...jobForm, companyId }));
      if (publishAfterCreate) {
        await adminApi.publishJob(job.id);
      }
      return job;
    },
    onSuccess: () => {
      setJobForm(emptyAdminJobForm());
      setNewCompanyForm(emptyCompanyForm());
      setNewEmployerForm(emptyEmployerForm());
      setShowCreate(false);
      setActionError(null);
      invalidateJobs();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidateJobs();
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => adminApi.closeJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidateJobs();
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectJob(id),
    onSuccess: () => {
      setActionError(null);
      invalidateJobs();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const rawJobs = tab === 'all' ? (allJobsQuery.data ?? []) : (pendingJobsQuery.data ?? []);
  const jobs = filterCompanyId
    ? rawJobs.filter((j) => j.companyId === filterCompanyId)
    : rawJobs;

  const companies = companiesQuery.data ?? [];
  const companiesByJobs = useMemo(() => {
    return [...companies].sort(
      (a, b) => (b._count?.jobs ?? 0) - (a._count?.jobs ?? 0),
    );
  }, [companies]);

  const selectedCompany = companies.find((c) => c.id === jobForm.companyId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    createMutation.mutate();
  };

  const pickerCompanies = pickerCompaniesQuery.data ?? companies;

  const companySelect = (
    <div className="form-input-group">
      <label htmlFor="adm-co-search">Post on behalf of company *</label>
      <input
        id="adm-co-search"
        placeholder="Search by company name…"
        value={companyPickerSearch}
        onChange={(e) => setCompanyPickerSearch(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />
      <div
        role="listbox"
        aria-label="Select company"
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
        }}
      >
        {pickerCompanies.length === 0 ? (
          <p className="muted" style={{ padding: '0.75rem', margin: 0 }}>
            No companies match your search.
          </p>
        ) : (
          pickerCompanies.map((c) => {
            const selected = jobForm.companyId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setJobForm({ ...jobForm, companyId: c.id })}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.65rem 0.85rem',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  background: selected ? 'rgba(11, 87, 208, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: selected ? 700 : 400,
                }}
              >
                {c.name}{' '}
                <span className="muted" style={{ fontWeight: 400 }}>
                  ({c._count?.jobs ?? 0} jobs)
                </span>
              </button>
            );
          })
        )}
      </div>
      {selectedCompany && (
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
          Selected: <strong>{selectedCompany.name}</strong> · {selectedCompany.verificationStatus} ·{' '}
          {selectedCompany.canSelfPublishJobs ? 'direct posting' : 'review required'}
          {selectedCompany.portalStatus === 'suspended' ? ' · SUSPENDED' : ''}
        </p>
      )}
    </div>
  );

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
            <span className="section-eyebrow">Admin portal</span>
            <h1 className="board-title" style={{ margin: '0.25rem 0' }}>
              Job postings
            </h1>
            <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
              Search companies and jobs, post on behalf of partners, and manage the review queue.
            </p>
          </div>
          <button
            type="button"
            className="btn-nav-register"
            onClick={() => {
              setActionError(null);
              setShowCreate((v) => !v);
            }}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            <span>{showCreate ? '✕ Close studio' : '+ Post new job'}</span>
          </button>
        </div>
      </div>

      <div className="form-input-group" style={{ maxWidth: '480px', marginBottom: '1.5rem' }}>
        <label htmlFor="job-admin-search">Search jobs and companies</label>
        <input
          id="job-admin-search"
          placeholder="Company name or job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {actionError && <div className="alert-box-error">{actionError}</div>}

      {showCreate && (
        <div
          className="jobs-filter-card"
          style={{ marginBottom: '2.5rem', border: '2px solid rgba(11, 87, 208, 0.3)' }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a2540', margin: '0 0 1.25rem' }}>
            Post job advertisement
          </h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="radio"
                name="postMode"
                checked={postMode === 'existing'}
                onChange={() => setPostMode('existing')}
              />
              Existing company
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="radio"
                name="postMode"
                checked={postMode === 'new'}
                onChange={() => setPostMode('new')}
              />
              Register new company & post
            </label>
          </div>

          <form onSubmit={handleCreate}>
            {postMode === 'new' && (
              <>
                <h3 style={{ margin: '0 0 0.5rem' }}>New company</h3>
                <CompanyFormFields value={newCompanyForm} onChange={setNewCompanyForm} idPrefix="new-co" />
                <h3 style={{ margin: '1rem 0 0.5rem' }}>Company login</h3>
                <EmployerCredentialsFields
                  value={newEmployerForm}
                  onChange={setNewEmployerForm}
                  idPrefix="new-emp"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                  <input
                    type="checkbox"
                    checked={newCompanyCanPost}
                    onChange={(e) => setNewCompanyCanPost(e.target.checked)}
                  />
                  Allow direct posting for this company
                </label>
              </>
            )}

            <AdminJobFormFields
              value={jobForm}
              onChange={setJobForm}
              hideCompanySelect={postMode === 'new'}
              companySelect={postMode === 'existing' ? companySelect : undefined}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={publishAfterCreate}
                onChange={(e) => setPublishAfterCreate(e.target.checked)}
              />
              Publish live immediately after saving
            </label>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={createMutation.isPending}
                style={{ width: 'auto', padding: '0.85rem 2rem' }}
              >
                {createMutation.isPending ? 'Saving…' : 'Save job'}
              </button>
              <button type="button" className="btn-clear-filters" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 320px) 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <div className="card" style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Filter job list by company</h2>
            {filterCompanyId && (
              <button
                type="button"
                className="btn-clear-filters"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setFilterCompanyId(null)}
              >
                Clear filter
              </button>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {companiesByJobs.map((c) => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  active={filterCompanyId === c.id}
                  onSelect={() =>
                    setFilterCompanyId((prev) => (prev === c.id ? null : c.id))
                  }
                />
              ))}
            </tbody>
          </table>
          {companiesByJobs.length === 0 && (
            <p className="muted" style={{ padding: '0.5rem 0' }}>No companies found.</p>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
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
              All jobs ({allJobsQuery.data?.length ?? 0})
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
              Pending review ({pendingJobsQuery.data?.length ?? 0})
            </button>
          </div>

          <div className="jobs-board-grid">
            {jobs.map((job) => (
              <div key={job.id} className="premium-job-card">
                <div className="job-card-header">
                  <div className="company-badge">
                    {job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div className="job-card-meta">
                    <span className="job-company-name">{job.company?.name ?? 'Partner employer'}</span>
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
                  <span className="tag-pill tag-type">
                    {job.employmentType.replace('_', ' ').toUpperCase()}
                  </span>
                  {job.location && <span className="tag-pill tag-location">{job.location.name}</span>}
                </div>

                <div className="job-card-footer" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span className="job-deadline">
                    Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {job.status === 'pending_review' && (
                      <>
                        <button
                          type="button"
                          className="btn-card-apply"
                          style={{ background: '#16a34a', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                          onClick={() => publishMutation.mutate(job.id)}
                          disabled={publishMutation.isPending}
                        >
                          Publish live
                        </button>
                        <button
                          type="button"
                          className="btn-clear-filters"
                          style={{ cursor: 'pointer' }}
                          onClick={() => rejectMutation.mutate(job.id)}
                          disabled={rejectMutation.isPending}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {job.status === 'draft' && (
                      <button
                        type="button"
                        className="btn-card-apply"
                        style={{ background: '#16a34a', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                        onClick={() => publishMutation.mutate(job.id)}
                        disabled={publishMutation.isPending}
                      >
                        Publish live
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
                        Close vacancy
                      </button>
                    )}

                    <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                      View public ad →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {jobs.length === 0 && !allJobsQuery.isLoading && (
            <p className="muted">No jobs match your filters.</p>
          )}
        </div>
      </div>

      {credentials && (
        <AdminCredentialsModal
          email={credentials.email}
          temporaryPassword={credentials.temporaryPassword}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
};

const CompanyRow: React.FC<{
  company: Company;
  active: boolean;
  onSelect: () => void;
}> = ({ company, active, onSelect }) => (
  <tr
    style={{
      borderBottom: '1px solid #f1f5f9',
      cursor: 'pointer',
      background: active ? '#eff6ff' : undefined,
    }}
    onClick={onSelect}
  >
    <td style={{ padding: '0.5rem' }}>
      {company.name}
      {company.portalStatus === 'suspended' && (
        <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}> · off</span>
      )}
    </td>
    <td style={{ padding: '0.5rem' }}>{company._count?.jobs ?? 0}</td>
  </tr>
);
