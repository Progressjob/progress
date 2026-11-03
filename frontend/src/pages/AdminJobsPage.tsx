import { BackButton } from '../components/BackButton';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { CompanyPayload, CreateAdminJobPayload } from '../api/admin';
import { taxonomyApi } from '../api/taxonomy';
import { AdminCredentialsModal } from '../components/admin/AdminCredentialsModal';
import { AdminJobFormFields } from '../components/admin/AdminJobFormFields';
import { AdminJobStatusActions } from '../components/admin/AdminJobStatusActions';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { EmployerCredentialsFields } from '../components/admin/EmployerCredentialsFields';
import {
  emptyAdminJobForm,
  emptyCompanyForm,
  emptyEmployerForm,
  sanitizeCompanyPayload,
  sanitizeJobPayload,
} from '../components/admin/adminFormUtils';
import { formatJobStatus, prettyJobEnum } from '../components/admin/adminJobUi';
import { FeaturedVacancies } from '../components/jobs/FeaturedVacancies';
import { jobDeadlineDays } from '../utils/jobListing';
import type { EmploymentType, Job, JobStatus, WorkplaceType } from '../types/api';

const PAGE_SIZE = 24;

const HISTORY_STATUSES: JobStatus[] = ['closed', 'rejected', 'archived'];
const ACTIVE_STATUSES: JobStatus[] = ['draft', 'pending_review', 'published'];

const ACTIVE_STATUS_OPTIONS: Array<{ value: JobStatus | ''; label: string }> = [
  { value: '', label: 'All active' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

const HISTORY_STATUS_OPTIONS: Array<{ value: JobStatus | ''; label: string }> = [
  { value: '', label: 'All history' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType | ''; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'volunteer', label: 'Volunteer' },
];

const WORKPLACE_OPTIONS: Array<{ value: WorkplaceType | ''; label: string }> = [
  { value: '', label: 'All workplaces' },
  { value: 'on_site', label: 'On site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const statusParam = (searchParams.get('status') ?? '') as JobStatus | '';
  const companyId = searchParams.get('companyId') ?? '';
  const industry = searchParams.get('industry') ?? '';
  const employmentType = (searchParams.get('employmentType') ?? '') as EmploymentType | '';
  const workplaceType = (searchParams.get('workplaceType') ?? '') as WorkplaceType | '';
  const employerEdited = searchParams.get('employerEdited') === 'true';
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const viewParam = searchParams.get('view');
  const view: 'active' | 'history' =
    viewParam === 'history' || viewParam === 'active'
      ? viewParam
      : statusParam && HISTORY_STATUSES.includes(statusParam)
        ? 'history'
        : 'active';
  const statusOptions = view === 'history' ? HISTORY_STATUS_OPTIONS : ACTIVE_STATUS_OPTIONS;
  const status =
    statusParam &&
    (view === 'history' ? HISTORY_STATUSES : ACTIVE_STATUSES).includes(statusParam)
      ? statusParam
      : '';
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [search, setSearch] = useState(q);
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setSearch(q);
  }, [q]);

  const patchParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const currentQ = prev.get('q') ?? '';
        if (search === currentQ) return prev;
        const next = new URLSearchParams(prev);
        if (search.trim()) next.set('q', search.trim());
        else next.delete('q');
        next.delete('page');
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setSearchParams]);

  const setFilter = (key: string, value: string) => {
    patchParams({ [key]: value, page: '' });
  };

  const sharedListFilters = {
    q: q || undefined,
    companyId: companyId || undefined,
    industry: industry || undefined,
    employmentType: employmentType || undefined,
    workplaceType: workplaceType || undefined,
    employerEdited: employerEdited || undefined,
  };

  const jobsQuery = useQuery({
    queryKey: [
      'admin',
      'jobs',
      view,
      q,
      status,
      companyId,
      industry,
      employmentType,
      workplaceType,
      employerEdited,
      page,
    ],
    queryFn: () =>
      adminApi.listJobs({
        ...sharedListFilters,
        status: status || undefined,
        scope: view,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const activeCountQuery = useQuery({
    queryKey: ['admin', 'jobs', 'count', 'active', sharedListFilters],
    queryFn: () => adminApi.listJobs({ ...sharedListFilters, scope: 'active', page: 1, pageSize: 1 }),
  });

  const historyCountQuery = useQuery({
    queryKey: ['admin', 'jobs', 'count', 'history', sharedListFilters],
    queryFn: () => adminApi.listJobs({ ...sharedListFilters, scope: 'history', page: 1, pageSize: 1 }),
  });

  const companiesQuery = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: () => adminApi.listCompanies(),
  });

  const industriesQuery = useQuery({
    queryKey: ['taxonomy', 'industries'],
    queryFn: () => taxonomyApi.industries(),
  });

  const setView = (next: 'active' | 'history') => {
    patchParams({ view: next, status: '', page: '' });
    setActionNotice(null);
  };

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
      let nextCompanyId = jobForm.companyId;
      if (postMode === 'new') {
        const provisioned = await adminApi.provisionCompany({
          company: sanitizeCompanyPayload(newCompanyForm),
          employer: newEmployerForm,
          verify: false,
          canSelfPublishJobs: newCompanyCanPost,
        });
        nextCompanyId = provisioned.company.id;
        setCredentials(provisioned.credentials);
        return null; // Company must be reviewed before any job can be created.
      }
      if (!nextCompanyId) throw new Error('Select a company');
      const job = await adminApi.createJob(sanitizeJobPayload({ ...jobForm, companyId: nextCompanyId }));
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
      setActionNotice(view === 'history' ? 'Job reopened and moved to Active.' : null);
      invalidateJobs();
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => adminApi.closeJob(id),
    onSuccess: () => {
      setActionError(null);
      setActionNotice('Job closed and moved to History.');
      invalidateJobs();
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectJob(id),
    onSuccess: () => {
      setActionError(null);
      setActionNotice('Job rejected and moved to History.');
      invalidateJobs();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => adminApi.archiveJob(id),
    onSuccess: () => {
      setActionError(null);
      setActionNotice('Job archived in History.');
      invalidateJobs();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const jobs = jobsQuery.data?.items ?? [];
  const total = jobsQuery.data?.total ?? 0;
  const activeTotal = activeCountQuery.data?.total ?? (view === 'active' ? total : 0);
  const historyTotal = historyCountQuery.data?.total ?? (view === 'history' ? total : 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const companies = companiesQuery.data ?? [];
  const selectedCompany = companies.find((c) => c.id === jobForm.companyId);
  const pickerCompanies = pickerCompaniesQuery.data ?? companies;
  const busy =
    publishMutation.isPending ||
    closeMutation.isPending ||
    rejectMutation.isPending ||
    archiveMutation.isPending;

  const industries = industriesQuery.data ?? [];
  const hasFilters = Boolean(
    q || status || companyId || industry || employmentType || workplaceType || employerEdited,
  );

  const rangeLabel = useMemo(() => {
    if (!total) return '0 jobs';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from}–${to} of ${total}`;
  }, [page, total]);

  const industryGroups = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; jobs: Job[] }>();
    for (const job of jobs) {
      const key = job.company?.industry?.slug || 'uncategorized';
      const name = job.company?.industry?.name || 'Uncategorized';
      const existing = groups.get(key);
      if (existing) existing.jobs.push(job);
      else groups.set(key, { key, name, jobs: [job] });
    }
    return [...groups.values()].sort((a, b) => {
      if (a.key === 'uncategorized') return 1;
      if (b.key === 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [jobs]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (postMode === 'new' && !newCompanyForm.businessLicenceFileId) { setActionError('Upload a business licence.'); return; }
    if (postMode === 'new' && !newCompanyForm.logoFileId) {
      setActionError('Upload a company logo before posting jobs.');
      return;
    }
    createMutation.mutate();
  };

  const renderAdminFooter = (job: Job) => {
    const deadline = jobDeadlineDays(job.applicationDeadline);
    return (
      <>
        <div className="jb-admin-meta">
          <span className={`admin-status-pill is-${job.status}`}>{formatJobStatus(job.status)}</span>
          <span className={`jb-admin-deadline${deadline.urgent ? ' is-urgent' : ''}`}>
            {deadline.closed ? 'Closed' : deadline.label}
          </span>
          <span className="jb-admin-type">{prettyJobEnum(job.employmentType)}</span>
          {job.employerEdited && <span className="admin-status-pill is-edited">Edited</span>}
        </div>
        <div className="admin-jobs-actions">
          <Link to={`/admin/jobs/${job.id}`} className="admin-jobs-action">
            Open
          </Link>
          {job.status !== 'archived' && (
            <Link to={`/admin/jobs/${job.id}?edit=1`} className="admin-jobs-action">
              Edit
            </Link>
          )}
          <AdminJobStatusActions
            job={job}
            busy={busy}
            onPublish={(id) => publishMutation.mutate(id)}
            onReopen={(id) => navigate(`/admin/jobs/${id}?edit=1&reopen=1`)}
            onReject={(id) => rejectMutation.mutate(id)}
            onClose={(id) => closeMutation.mutate(id)}
            onArchive={(id) => archiveMutation.mutate(id)}
          />
        </div>
      </>
    );
  };

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
        className="admin-company-picker"
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
                className={`admin-company-option${selected ? ' is-selected' : ''}`}
                onClick={() => setJobForm({ ...jobForm, companyId: c.id })}
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
    <div className="jobs-list-container jb-page admin-jobs-page">
      <section className="jb-hero jb-hero-admin">
        <div className="jb-hero-inner">
          <div className="jb-admin-hero-row">
            <div>
              <BackButton fallback="/admin" />
              <h1 className="jb-hero-title">
                Job <span>postings</span>
              </h1>
              <p className="jb-hero-copy">
                Browse by industry, then open Active or History to manage vacancies.
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
              {showCreate ? 'Close form' : '+ Post job'}
            </button>
          </div>

          <div className="employer-tabs-header jb-admin-tabs-header" style={{ marginTop: '1.15rem' }}>
            <div className="employer-tabs-nav" role="tablist" aria-label="Active and history job lists">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'active'}
                className={`employer-jobs-tab${view === 'active' ? ' is-active' : ''}`}
                onClick={() => setView('active')}
              >
                Active
                <span className="employer-job-pill-count">{activeTotal}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'history'}
                className={`employer-jobs-tab${view === 'history' ? ' is-active' : ''}`}
                onClick={() => setView('history')}
              >
                History
                <span className="employer-job-pill-count">{historyTotal}</span>
              </button>
            </div>
            <span className="jb-results-count">
              <strong>{rangeLabel}</strong>
            </span>
          </div>
        </div>
      </section>

      <div className="jb-body">

      {actionError && <div className="alert-box-error">{actionError}</div>}
      {actionNotice && <div className="employer-jobs-banner">{actionNotice}</div>}

      {showCreate && (
        <div className="card">
          <h2 className="admin-jobs-card-title">Post job</h2>
          <div className="admin-jobs-mode">
            <label>
              <input
                type="radio"
                name="postMode"
                checked={postMode === 'existing'}
                onChange={() => setPostMode('existing')}
              />
              Existing company
            </label>
            <label>
              <input
                type="radio"
                name="postMode"
                checked={postMode === 'new'}
                onChange={() => setPostMode('new')}
              />
              Register company for review
            </label>
          </div>

          <form onSubmit={handleCreate}>
            {postMode === 'new' && (
              <>
                <h3 className="admin-jobs-subhead">New company</h3><p>The company will be pending licence review. Approve it in Companies before creating its first job.</p>
                <CompanyFormFields value={newCompanyForm} onChange={setNewCompanyForm} idPrefix="new-co" />
                <h3 className="admin-jobs-subhead">Company login</h3>
                <EmployerCredentialsFields
                  value={newEmployerForm}
                  onChange={setNewEmployerForm}
                  idPrefix="new-emp"
                />
                <label className="admin-jobs-check">
                  <input
                    type="checkbox"
                    disabled
                    checked={newCompanyCanPost}
                    onChange={(e) => setNewCompanyCanPost(e.target.checked)}
                  />
                  Direct posting can be enabled after company approval
                </label>
              </>
            )}

            {postMode === 'existing' && <>
            <AdminJobFormFields
              value={jobForm}
              onChange={setJobForm}
              hideCompanySelect={false}
              companySelect={postMode === 'existing' ? companySelect : undefined}
            />

            <label className="admin-jobs-check">
              <input
                type="checkbox"
                checked={publishAfterCreate}
                onChange={(e) => setPublishAfterCreate(e.target.checked)}
              />
              Publish live immediately after saving
            </label>

            </>}
            <div className="admin-jobs-form-actions">
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={createMutation.isPending}
                style={{ width: 'auto', padding: '0.85rem 2rem' }}
              >
                {createMutation.isPending ? 'Saving…' : postMode === 'new' ? 'Register company for review' : 'Save job'}
              </button>
              <button type="button" className="btn-clear-filters" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="jb-admin-toolbar">
        <form
          className="jb-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ q: search.trim() });
          }}
        >
          <svg className="jb-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            id="job-admin-search"
            placeholder="Search by job title, company, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search job postings"
          />
          <button type="submit" className="jb-search-submit">
            Search
          </button>
        </form>

        {industries.length > 0 && (
          <div className="jb-industry-bar" role="tablist" aria-label="Browse by industry">
            <button
              type="button"
              role="tab"
              aria-selected={!industry}
              className={!industry ? 'is-selected' : undefined}
              onClick={() => setFilter('industry', '')}
            >
              All industries
            </button>
            {industries.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={industry === item.slug}
                className={industry === item.slug ? 'is-selected' : undefined}
                onClick={() => setFilter('industry', item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        <div className="jb-filters jb-filters-admin">
          <span className="jb-filters-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Filter
          </span>
          <label className="jb-filter-select">
            <span>Status</span>
            <select
              id="job-admin-status"
              value={status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="jb-filter-select">
            <span>Company</span>
            <select
              id="job-admin-company"
              value={companyId}
              onChange={(e) => setFilter('companyId', e.target.value)}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="jb-filter-select">
            <span>Employment</span>
            <select
              id="job-admin-type"
              value={employmentType}
              onChange={(e) => setFilter('employmentType', e.target.value)}
            >
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="jb-filter-select">
            <span>Workplace</span>
            <select
              id="job-admin-place"
              value={workplaceType}
              onChange={(e) => setFilter('workplaceType', e.target.value)}
            >
              {WORKPLACE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="jb-filter-select">
            <span>Edits</span>
            <select
              id="job-admin-edited"
              value={employerEdited ? 'true' : ''}
              onChange={(e) => setFilter('employerEdited', e.target.value)}
            >
              <option value="">All jobs</option>
              <option value="true">Edited by employer</option>
            </select>
          </label>
          {hasFilters && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={() => {
                const next = new URLSearchParams();
                if (view === 'history') next.set('view', 'history');
                setSearchParams(next);
                setActionNotice(null);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {jobsQuery.isError && (
        <div className="alert-box-error">{(jobsQuery.error as Error).message}</div>
      )}

      <section
        className="jb-admin-industry-board"
        aria-label={view === 'history' ? 'Job history by industry' : 'Active jobs by industry'}
      >
        {!jobsQuery.isLoading && jobs.length === 0 && (
          <div className="empty-results-box">
            <div className="empty-icon-circle">💼</div>
            <h3>
              {view === 'history'
                ? hasFilters
                  ? 'No history matches your filters'
                  : 'No closed jobs yet'
                : hasFilters
                  ? 'No active jobs match your filters'
                  : 'No active jobs'}
            </h3>
            <p>
              {view === 'history'
                ? 'Closed, rejected, and archived vacancies will appear here.'
                : 'Try another search or industry, or post a new vacancy.'}
            </p>
          </div>
        )}

        {jobsQuery.isLoading ? (
          <FeaturedVacancies
            jobs={[]}
            loading
            title={view === 'history' ? 'History' : 'Featured industries'}
            description="Loading vacancies…"
            publicLinks={false}
          />
        ) : (
          industryGroups.map((group) => (
            <FeaturedVacancies
              key={group.key}
              jobs={group.jobs}
              title={group.name}
              description={
                view === 'history'
                  ? `${group.jobs.length} closed or archived in this industry`
                  : `${group.jobs.length} active posting${group.jobs.length === 1 ? '' : 's'} in this industry`
              }
              badge={(job) => formatJobStatus(job.status)}
              publicLinks={false}
              hrefFor={(job) => `/admin/jobs/${job.id}`}
              footer={renderAdminFooter}
            />
          ))
        )}

        {total > 0 && pageCount > 1 && (
          <div className="pagination-wrapper">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => patchParams({ page: String(page - 1) })}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page <strong>{page}</strong> of <strong>{pageCount}</strong>
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= pageCount}
              onClick={() => patchParams({ page: String(page + 1) })}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {credentials && (
        <AdminCredentialsModal
          email={credentials.email}
          temporaryPassword={credentials.temporaryPassword}
          onClose={() => setCredentials(null)}
        />
      )}
      </div>
    </div>
  );
};
