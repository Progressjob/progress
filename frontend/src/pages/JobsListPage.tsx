import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import type { Category, EmploymentType, WorkplaceType } from '../types/api';
import { CustomDropdown, type DropdownOption } from '../components/CustomDropdown';

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

export const JobsListPage: React.FC = () => {
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
  const jobsData = jobsQuery.data;
  const totalPages = jobsData ? Math.max(1, Math.ceil(jobsData.total / jobsData.limit)) : 1;

  // Dropdown options
  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  const regionOptions: DropdownOption[] = [
    { value: '', label: 'All Regions' },
    { value: 'adama-oromia', label: 'Adama' },
    { value: 'bishoftu-oromia', label: 'Bishoftu' },
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
    { value: '', label: 'All Workplaces' },
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

  return (
    <div className="jobs-list-container">
      {/* Page Header */}
      <div className="board-header">
        <span className="section-eyebrow">Verified Vacancies</span>
        <h1 className="board-title">Explore Career Opportunities</h1>
        <p className="board-subtitle">
          Handpicked roles across Adama, Bishoftu, and leading Ethiopian enterprises. Direct employer applications.
        </p>
      </div>

      {/* Filter Capsule Card */}
      <div className="jobs-filter-card">
        <div className="filter-grid-row">
          {/* Keyword Input */}
          <div className="filter-input-wrap">
            <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by job title or keyword..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              aria-label="Search jobs"
            />
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
              placeholder="All Regions"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" strokeWidth="2" />
                </svg>
              }
            />
          </div>
        </div>

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
              placeholder="Workplace Model"
            />
          </div>

          <button type="button" className="btn-clear-filters" onClick={handleReset}>
            Reset Filters
          </button>

          {jobsData && (
            <span className="results-count-text">
              Showing <strong>{jobsData.data.length}</strong> of <strong>{jobsData.total}</strong> active vacancies
            </span>
          )}
        </div>
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
          <p>Try adjusting your search keywords or resetting filters to explore all open opportunities.</p>
          <button type="button" className="btn-nav-register" onClick={handleReset}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* Jobs Feed Grid */}
      <div className="jobs-board-grid">
        {jobsData?.data.map((job) => (
          <div key={job.id} className="premium-job-card">
            <div className="job-card-header">
              <div className="company-badge">
                {job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="job-card-meta">
                <span className="job-company-name">
                  {job.company ? job.company.name : 'Progress Partner Employer'}
                </span>
                <h2 className="job-card-title">
                  <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                </h2>
              </div>
            </div>

            <div className="job-card-tags">
              {job.location && (
                <span className="tag-pill tag-location">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  </svg>
                  {job.location.name}
                </span>
              )}
              <span className="tag-pill tag-type">
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
            </div>

            {job.summary && <p className="job-card-snippet">{job.summary}</p>}

            {job.salaryVisibility && (job.salaryMin || job.salaryMax) && (
              <div className="job-salary">
                <span className="salary-amount">
                  {job.salaryCurrency ?? 'ETB'}{' '}
                  {job.salaryMin ? Number(job.salaryMin).toLocaleString() : ''}
                  {job.salaryMin && job.salaryMax ? ' - ' : ''}
                  {job.salaryMax ? Number(job.salaryMax).toLocaleString() : ''}
                </span>
                <span className="salary-period">/ month</span>
              </div>
            )}

            <div className="job-card-footer">
              <span className="job-deadline">
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
              </span>
              <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                <span>View Position</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {jobsData && totalPages > 1 && (
        <div className="pagination-wrapper">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
