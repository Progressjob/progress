import { BackButton } from '../components/BackButton';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import type { Category, EmploymentType, Job } from '../types/api';
import { CustomDropdown, type DropdownOption } from '../components/CustomDropdown';
import { useAuth } from '../auth/AuthContext';
import { GuestJobAccessNote } from '../components/JobDetailLink';
import { FeaturedVacancies } from '../components/jobs/FeaturedVacancies';
import { LatestVacanciesGrid } from '../components/jobs/LatestVacanciesGrid';
import { useFeaturedJobs } from '../hooks/useFeaturedJobs';
import {
  EDUCATION_FILTER_OPTIONS,
  EXPERIENCE_FILTER_OPTIONS,
  SALARY_FILTER_OPTIONS,
} from '../constants/jobFilters';

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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const location = searchParams.get('location') || '';
  const employmentType = (searchParams.get('employment_type') as EmploymentType) || '';
  const experience = searchParams.get('experience') || '';
  const education = searchParams.get('education') || '';
  const industry = searchParams.get('industry') || '';
  const salary = searchParams.get('salary') || '';
  const [search, setSearch] = useState(q);
  const [page, setPage] = useState(1);
  const [listedJobs, setListedJobs] = useState<Job[]>([]);
  const limit = 12;

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [q, category, location, employmentType, experience, education, industry, salary]);

  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const locationsQuery = useQuery({
    queryKey: ['taxonomy', 'locations'],
    queryFn: () => taxonomyApi.locations(),
  });

  const industriesQuery = useQuery({
    queryKey: ['taxonomy', 'industries'],
    queryFn: () => taxonomyApi.industries(),
  });

  const featuredQuery = useFeaturedJobs();

  const jobsQuery = useQuery({
    queryKey: ['jobs', { q, category, location, employmentType, experience, education, industry, salary, page, limit }],
    queryFn: () =>
      jobsApi.list({
        q,
        category,
        location,
        employment_type: employmentType,
        experience,
        education,
        industry,
        salary,
        page,
        limit,
      }),
  });

  useEffect(() => {
    const batch = jobsQuery.data?.data;
    if (!batch) return;
    setListedJobs((prev) => {
      if (page === 1) return batch;
      const seen = new Set(prev.map((job) => job.id));
      return [...prev, ...batch.filter((job) => !seen.has(job.id))];
    });
  }, [jobsQuery.data, page]);

  const categories = flattenCategories(categoriesQuery.data ?? []);
  const locations = locationsQuery.data ?? [];
  const industries = industriesQuery.data ?? [];
  const jobsData = jobsQuery.data;
  const total = jobsData?.total ?? 0;
  const hasMore = listedJobs.length < total;



  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'Field of Study' },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  const experienceOptions: DropdownOption[] = [
    { value: '', label: 'Experience' },
    ...EXPERIENCE_FILTER_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  const educationOptions: DropdownOption[] = [
    { value: '', label: 'Education' },
    ...EDUCATION_FILTER_OPTIONS,
  ];

  const industryOptions: DropdownOption[] = [
    { value: '', label: 'Industry' },
    ...industries.map((item) => ({ value: item.slug, label: item.name })),
  ];

  const salaryOptions: DropdownOption[] = [
    { value: '', label: 'Monthly Salary' },
    ...SALARY_FILTER_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  const regionOptions: DropdownOption[] = [
    { value: '', label: 'Location' },
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
    { value: '', label: 'Employment' },
    { value: 'full_time', label: 'Full time' },
    { value: 'part_time', label: 'Part time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'temporary', label: 'Temporary' },
  ];

  const patchParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set('q', search.trim());
    else next.delete('q');
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    patchParams({ q: search.trim() });
  };

  const handleReset = () => {
    setSearch('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    q || category || location || employmentType || experience || education || industry || salary,
  );

  return (
    <div className="jobs-list-container jb-page">
      <section className="jb-hero">
        <div className="jb-hero-inner">
          <BackButton fallback="/" />
          <h1 className="jb-hero-title">
            Jobs in <span>Ethiopia</span>
          </h1>
          <p className="jb-hero-copy">
            {user
              ? 'Browse verified vacancies from Progress and partner employers across Ethiopia.'
              : 'Browse open roles from verified employers. Sign in to view full application details.'}
          </p>
          {!user && <GuestJobAccessNote />}

          <div className="jb-search-tabs" aria-hidden>
            <span className="is-active">Search jobs</span>
          </div>

          <form className="jb-search-bar" onSubmit={handleSearch}>
            <svg className="jb-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by job title, company, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search jobs"
            />
            {search && (
              <button
                type="button"
                className="jb-search-clear"
                onClick={() => {
                  setSearch('');
                  patchParams({ q: '' });
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <button type="submit" className="jb-search-submit">
              Search
            </button>
          </form>

          <div className="jb-filters">
            <span className="jb-filters-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path d="M4 6h16M7 12h10M10 18h4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Filter
            </span>
            <CustomDropdown
              value={category}
              onChange={(val) => patchParams({ category: val })}
              options={categoryOptions}
              placeholder="Field of Study"
            />
            <CustomDropdown
              value={experience}
              onChange={(val) => patchParams({ experience: val })}
              options={experienceOptions}
              placeholder="Experience"
            />
            <CustomDropdown
              value={education}
              onChange={(val) => patchParams({ education: val })}
              options={educationOptions}
              placeholder="Education"
            />
            <CustomDropdown
              value={employmentType}
              onChange={(val) => patchParams({ employment_type: val })}
              options={employmentTypeOptions}
              placeholder="Employment"
            />
            <CustomDropdown
              value={industry}
              onChange={(val) => patchParams({ industry: val })}
              options={industryOptions}
              placeholder="Industry"
            />
            <CustomDropdown
              value={salary}
              onChange={(val) => patchParams({ salary: val })}
              options={salaryOptions}
              placeholder="Monthly Salary"
            />
            <CustomDropdown
              value={location}
              onChange={(val) => patchParams({ location: val })}
              options={regionOptions}
              placeholder="Location"
            />
            {hasActiveFilters && (
              <button type="button" className="btn-clear-filters" onClick={handleReset}>
                Reset
              </button>
            )}
            {jobsData && (
              <span className="jb-results-count">
                <strong>{jobsData.total}</strong> vacancies
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="jb-body">
        {jobsQuery.isError && (
          <div className="alert-box-error">Failed to load vacancies: {(jobsQuery.error as Error).message}</div>
        )}

        {featuredQuery.isError && <p role="alert">Could not load recommendations. <button type="button" onClick={() => void featuredQuery.refetch()}>Try again</button></p>}
        <FeaturedVacancies jobs={featuredQuery.data?.data ?? []} loading={featuredQuery.isLoading}
          title={featuredQuery.title} description={featuredQuery.description} />
        {featuredQuery.showProfileLink && <p><Link to="/candidate/profile">Update your profile for better matches</Link></p>}

        <section className="jb-latest" aria-label="Latest job vacancies">
          <div className="jb-latest-head">
            <div>
              <p className="jb-kicker">Latest job vacancies</p>
              <h2 className="jb-section-title">Freshly posted opportunities</h2>
            </div>
          </div>

          {jobsData && jobsData.total === 0 && (
            <div className="empty-results-box">
              <div className="empty-icon-circle">💼</div>
              <h3>No matching vacancies found</h3>
              <p>Try another keyword, location, or reset filters to see all opportunities.</p>
              <button type="button" className="btn-nav-register" onClick={handleReset}>
                Reset all filters
              </button>
            </div>
          )}

          <LatestVacanciesGrid jobs={listedJobs} loading={jobsQuery.isLoading && page === 1} />

          {hasMore && (
            <div className="jb-more-wrap">
              <p className="jb-more-count">
                Showing <strong>{listedJobs.length}</strong> of <strong>{total}</strong> vacancies
              </p>
              <button
                type="button"
                className="jb-more-btn"
                disabled={jobsQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                {jobsQuery.isFetching ? 'Loading…' : 'Display more'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
