import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import type { Category, EmploymentType, WorkplaceType } from '../types/api';

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
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType | ''>('');
  const [careerLevel, setCareerLevel] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

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

  const handleReset = () => {
    setQ('');
    setCategory('');
    setLocation('');
    setEmploymentType('');
    setWorkplaceType('');
    setCareerLevel('');
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Public Job Board</h1>
        <p className="muted">
          Showing published jobs with active deadlines. Filters use taxonomy slugs.
        </p>
      </div>

      <div className="card filter-bar">
        <div className="grid-filters">
          <div className="field">
            <label htmlFor="filter-q">Keyword Search (q)</label>
            <input
              id="filter-q"
              type="text"
              placeholder="e.g. developer, accountant..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="filter-cat">Category (slug)</label>
            <select
              id="filter-cat"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-loc">Location (slug)</label>
            <select
              id="filter-loc"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.slug}>
                  {l.name} {l.region ? `— ${l.region}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-emp">Employment Type</label>
            <select
              id="filter-emp"
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value as EmploymentType | '');
                setPage(1);
              }}
            >
              <option value="">Any</option>
              <option value="full_time">full_time</option>
              <option value="part_time">part_time</option>
              <option value="contract">contract</option>
              <option value="internship">internship</option>
              <option value="temporary">temporary</option>
              <option value="volunteer">volunteer</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-work">Workplace Type</label>
            <select
              id="filter-work"
              value={workplaceType}
              onChange={(e) => {
                setWorkplaceType(e.target.value as WorkplaceType | '');
                setPage(1);
              }}
            >
              <option value="">Any</option>
              <option value="on_site">on_site</option>
              <option value="hybrid">hybrid</option>
              <option value="remote">remote</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-career">Career Level</label>
            <input
              id="filter-career"
              type="text"
              placeholder="e.g. entry, senior"
              value={careerLevel}
              onChange={(e) => {
                setCareerLevel(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            Clear Filters
          </button>
          {jobsData && (
            <span className="muted">
              Total matching jobs: <strong>{jobsData.total}</strong>
            </span>
          )}
        </div>
      </div>

      {jobsQuery.isLoading && <div className="card">Loading jobs...</div>}
      {jobsQuery.isError && (
        <div className="card alert-error">
          Failed to load jobs: {(jobsQuery.error as Error).message}
        </div>
      )}

      {jobsData && jobsData.data.length === 0 && (
        <div className="card">No published jobs match the current filters.</div>
      )}

      <div className="stack">
        {jobsData?.data.map((job) => (
          <div key={job.id} className="card job-card">
            <div className="job-card-header">
              <div>
                <h2 className="job-title">
                  <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                </h2>
                <div className="job-meta">
                  {job.company && (
                    <Link to={`/companies/${job.company.slug}`} className="company-link">
                      {job.company.name}
                    </Link>
                  )}
                  {job.location && <span>• {job.location.name}</span>}
                  {job.category && <span>• {job.category.name}</span>}
                </div>
              </div>
              <div className="badges">
                <span className="badge">{job.employmentType}</span>
                <span className="badge badge-outline">{job.workplaceType}</span>
                <span className="badge badge-info">{job.applicationMethod}</span>
              </div>
            </div>

            {job.summary && <p className="job-summary">{job.summary}</p>}

            <div className="job-card-footer">
              <span className="muted">
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString()} • Vacancies:{' '}
                {job.vacanciesCount}
              </span>
              <Link to={`/jobs/${job.slug}`} className="btn btn-sm">
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {jobsData && totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {jobsData.page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
