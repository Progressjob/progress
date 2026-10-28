import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import { publicFileUrl } from '../api/files';
import type { Category, EmploymentType, WorkplaceType } from '../types/api';
import { CustomDropdown, type DropdownOption } from '../components/CustomDropdown';
import { useAuth } from '../auth/AuthContext';
import { GuestJobAccessNote, JobDetailLink } from '../components/JobDetailLink';

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(cat);
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children));
    }
  }
  return result;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function deadlineInfo(iso: string): { text: string; urgent: boolean } {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return { text: iso, urgent: false };
  const diffDays = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const formatted = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (diffDays < 0) return { text: `Closed on ${formatted}`, urgent: true };
  if (diffDays === 0) return { text: 'Closing today', urgent: true };
  if (diffDays === 1) return { text: '1 day left to apply', urgent: true };
  if (diffDays <= 7) return { text: `${diffDays} days left (${formatted})`, urgent: true };
  return { text: `Deadline: ${formatted}`, urgent: false };
}

export const JobsListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>(
    (searchParams.get('employment_type') as EmploymentType) || '',
  );
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType | ''>(
    (searchParams.get('workplace_type') as WorkplaceType) || '',
  );
  const [careerLevel, setCareerLevel] = useState(searchParams.get('career_level') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const limit = 10;

  // Sync state when URL params change
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setLocation(searchParams.get('location') || '');
    setEmploymentType((searchParams.get('employment_type') as EmploymentType) || '');
    setWorkplaceType((searchParams.get('workplace_type') as WorkplaceType) || '');
  }, [searchParams]);

  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const locationsQuery = useQuery({
    queryKey: ['taxonomy', 'locations'],
    queryFn: () => taxonomyApi.locations(),
  });

  const jobsQuery = useQuery({
    queryKey: [
      'jobs',
      { q, category, location, employmentType, workplaceType, careerLevel, page, limit },
    ],
    queryFn: () =>
      jobsApi.list({
        q,
        category,
        location,
        employment_type: employmentType,
        workplace_type: workplaceType,
        career_level: careerLevel,
        page,
        limit,
      }),
  });

  const categories = flattenCategories(categoriesQuery.data ?? []);
  const locations = locationsQuery.data ?? [];
  const jobsData = jobsQuery.data;
  const totalPages = jobsData ? Math.max(1, Math.ceil(jobsData.total / jobsData.limit)) : 1;

  // Dropdown options
  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  const regionOptions: DropdownOption[] = [
    { value: '', label: 'All Locations / Cities' },
    ...locations.map((loc) => ({ value: loc.slug, label: loc.name })),
    ...(locations.length === 0
      ? [
        { value: 'addis-ababa', label: 'Addis Ababa' },
        { value: 'adama-oromia', label: 'Adama' },
        { value: 'bishoftu-oromia', label: 'Bishoftu' },
        { value: 'dukem-oromia', label: 'Dukem' },
        { value: 'hawassa', label: 'Hawassa' },
      ]
      : []),
  ];

  const employmentTypeOptions: DropdownOption[] = [
    { value: '', label: 'All Employment Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'temporary', label: 'Temporary' },
  ];

  const workplaceTypeOptions: DropdownOption[] = [
    { value: '', label: 'All Workplace Types' },
    { value: 'on_site', label: 'On-Site' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'remote', label: 'Remote' },
  ];

  const handleReset = () => {
    setQ('');
    setCategory('');
    setLocation('');
    setEmploymentType('');
    setWorkplaceType('');
    setCareerLevel('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(q || category || location || employmentType || workplaceType || careerLevel);

  return (
    <div className="jobs-list-container">
      {/* Ethiojobs/Geezjobs style Hero Header */}
      <div className="board-header">
        <span className="section-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Progress Verified Vacancies
        </span>
        <h1 className="board-title">Explore Career Opportunities</h1>
        <p className="board-subtitle">
          {user
          ? 'Handpicked vacancies across Adama, Bishoftu, Dukem, Addis Ababa, and leading industrial & corporate employers in Ethiopia.'
            : 'Browse open roles from verified employers. Sign in to access full direct application details.'}
        </p>
        {!user && <GuestJobAccessNote />}
      </div>

      {/* Modern Filter Capsule Card */}
      <div className="jobs-filter-card">
        {/* Main Search Row */}
        <div className="filter-grid-row">
          {/* Keyword Input */}
          <div className="filter-input-wrap">
            <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Job title, keywords, or skills..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              aria-label="Search jobs"
            />
            {q && (
              <button
                type="button"
                className="filter-clear-btn"
                onClick={() => {
                  setQ('');
                  setPage(1);
                }}
                aria-label="Clear keyword"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="filter-dropdown-wrap">
            <CustomDropdown
              value={category}
              onChange={(val) => {
                setCategory(val);
                setPage(1);
              }}
              options={categoryOptions}
              placeholder="All Categories"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
                </svg>
              }
            />
          </div>

          {/* Region Dropdown */}
          <div className="filter-dropdown-wrap">
            <CustomDropdown
              value={location}
              onChange={(val) => {
                setLocation(val);
                setPage(1);
              }}
              options={regionOptions}
              placeholder="All Locations"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" strokeWidth="2" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="filter-secondary-row">
          <div className="filter-dropdown-wrap-sm">
            <CustomDropdown
              value={employmentType}
              onChange={(val) => {
                setEmploymentType(val as EmploymentType | '');
                setPage(1);
              }}
              options={employmentTypeOptions}
              placeholder="Employment Type"
            />
          </div>

          <div className="filter-dropdown-wrap-sm">
            <CustomDropdown
              value={workplaceType}
              onChange={(val) => {
                setWorkplaceType(val as WorkplaceType | '');
                setPage(1);
              }}
              options={workplaceTypeOptions}
              placeholder="Workplace Type"
            />
          </div>

          {hasActiveFilters && (
            <button type="button" className="btn-clear-filters" onClick={handleReset}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Reset Filters
            </button>
          )}

          {jobsData && (
            <span className="results-count-text">
              Showing <strong>{jobsData.data.length}</strong> of <strong>{jobsData.total}</strong> active vacancies
            </span>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="active-filters-bar">
            <span className="active-filters-label">Active Filters:</span>
            {q && (
              <span className="active-filter-chip">
                Keyword: "{q}"
                <button type="button" onClick={() => setQ('')}>✕</button>
              </span>
            )}
            {category && (
              <span className="active-filter-chip">
                {categoryOptions.find((c) => c.value === category)?.label || category}
                <button type="button" onClick={() => setCategory('')}>✕</button>
              </span>
            )}
            {location && (
              <span className="active-filter-chip">
                {regionOptions.find((r) => r.value === location)?.label || location}
                <button type="button" onClick={() => setLocation('')}>✕</button>
              </span>
            )}
            {employmentType && (
              <span className="active-filter-chip">
                {employmentTypeOptions.find((e) => e.value === employmentType)?.label || employmentType}
                <button type="button" onClick={() => setEmploymentType('')}>✕</button>
              </span>
            )}
            {workplaceType && (
              <span className="active-filter-chip">
                {workplaceTypeOptions.find((w) => w.value === workplaceType)?.label || workplaceType}
                <button type="button" onClick={() => setWorkplaceType('')}>✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {jobsQuery.isLoading && (
        <div className="jobs-loading-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="job-card-skeleton" />
          ))}
        </div>
      )}

      {jobsQuery.isError && (
        <div className="alert-box-error">
          Failed to load vacancies: {(jobsQuery.error as Error).message}
        </div>
      )}

      {jobsData && jobsData.data.length === 0 && (
        <div className="empty-results-box">
          <div className="empty-icon-circle">💼</div>
          <h3>No matching vacancies found</h3>
          <p>Try adjusting your search keywords, location, or resetting filters to explore all opportunities.</p>
          <button type="button" className="btn-nav-register" onClick={handleReset}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* Jobs Feed Grid (Geezjobs & Ethiojobs Style) */}
      <div className="jobs-board-grid">
                {jobsData?.data.map((job) => {
                  const deadline = deadlineInfo(job.applicationDeadline);
                  const posted = timeAgo(job.postedAt || job.createdAt);
                  const logoUrl = job.company?.logo?.id ? publicFileUrl(job.company.logo.id) : null;
                  const companyInitial = job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P';

                  return (
            <div key={job.id} className="premium-job-card">
              <div className="job-card-main-content">
                {/* Company Logo / Monogram */}
                <div className="company-badge-wrap">
                  {logoUrl ? (
                    <img src={logoUrl} alt={job.company?.name || ''} className="company-logo-img" />
                  ) : (
                    <div className="company-badge">{companyInitial}</div>
                  )}
                </div>

                {/* Job Info */}
                <div className="job-card-meta">
                  <div className="job-card-top-row">
                    <span className="job-company-name">
                      {job.company ? job.company.name : 'Progress Partner Employer'}
                    </span>
                    {job.company?.verificationStatus === 'verified' && (
                      <span className="verified-badge-pill" title="Verified Employer">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Verified
                      </span>
                    )}
                    <span className="job-posted-time">• {posted}</span>
                  </div>

                  <h2 className="job-card-title">
                    <JobDetailLink slug={job.slug}>{job.title}</JobDetailLink>
                  </h2>

                  {/* Badges / Meta Pills */}
                  <div className="job-card-tags">
                    {job.location && (
                      <span className="tag-pill tag-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                          <circle cx="12" cy="10" r="3" strokeWidth="2" />
                        </svg>
                        {job.location.name}
                      </span>
                    )}
                    <span className="tag-pill tag-type">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
                      </svg>
                      {job.employmentType.replace('_', ' ').toUpperCase()}
                    </span>
                    {job.workplaceType && (
                      <span className="tag-pill tag-workplace">
                        {job.workplaceType.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    {job.category && (
                      <span className="tag-pill tag-category">{job.category.name}</span>
                    )}
                    {(job.experienceMinYears != null || job.experienceMaxYears != null) && (
                      <span className="tag-pill tag-exp">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                        </svg>
                        {job.experienceMinYears ? `${job.experienceMinYears}+ yrs exp` : `Up to ${job.experienceMaxYears} yrs exp`}
                      </span>
                    )}
                  </div>

                  {job.summary && <p className="job-card-snippet">{job.summary}</p>}

                  {job.salaryVisibility && (job.salaryMin || job.salaryMax) && (
                    <div className="job-salary-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-7 0c0 2 1.5 3 3.5 3.5s3.5 1.5 3.5 3.5a3.5 3.5 0 0 1-7 0" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="salary-amount">
                        {job.salaryCurrency ?? 'ETB'}{' '}
                        {job.salaryMin ? Number(job.salaryMin).toLocaleString() : ''}
                        {job.salaryMin && job.salaryMax ? ' - ' : ''}
                        {job.salaryMax ? Number(job.salaryMax).toLocaleString() : ''}
                      </span>
                      <span className="salary-period">/ month</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Deadline & Action CTA */}
              <div className="job-card-footer">
                <span className={`job-deadline-tag ${deadline.urgent ? 'is-urgent' : ''}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                  </svg>
                  {deadline.text}
                </span>

                <JobDetailLink slug={job.slug} className="btn-card-apply">
                  <span>{user ? 'View Position' : 'Sign in to Apply'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </JobDetailLink>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {jobsData && totalPages > 1 && (
        <div className="pagination-wrapper">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page <strong>{jobsData.page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
                  );
                };
