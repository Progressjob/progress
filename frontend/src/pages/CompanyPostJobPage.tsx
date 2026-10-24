import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { taxonomyApi } from '../api/taxonomy';
import type { Category, EmploymentType, WorkplaceType } from '../types/api';

function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = [];
  for (const c of categories) {
    out.push(c);
    if (c.children?.length) out.push(...flattenCategories(c.children));
  }
  return out;
}

export const CompanyPostJobPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const locationsQuery = useQuery({
    queryKey: ['taxonomy', 'locations'],
    queryFn: () => taxonomyApi.locations(),
  });

  const categoryOptions = useMemo(
    () => flattenCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [experienceMinYears, setExperienceMinYears] = useState<number | ''>('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('on_site');
  const [salaryMode, setSalaryMode] = useState<'negotiable' | 'range'>('negotiable');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [salaryCurrency, setSalaryCurrency] = useState('ETB');
  const [applicationDeadline, setApplicationDeadline] = useState('2026-12-31');
  const [vacanciesCount, setVacanciesCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categoryOptions.find((c) => c.id === categoryId);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const job = await employerApi.createJob(companyId!, {
        categoryId,
        locationId: locationId || undefined,
        title,
        description: responsibilities.trim(),
        responsibilities: responsibilities.trim() || undefined,
        requirements: requirements.trim() || undefined,
        experienceMinYears: experienceMinYears === '' ? undefined : Number(experienceMinYears),
        employmentType,
        workplaceType,
        applicationDeadline,
        vacanciesCount: Number(vacanciesCount) || 1,
        salaryMin: salaryMode === 'range' && salaryMin !== '' ? Number(salaryMin) : undefined,
        salaryMax: salaryMode === 'range' && salaryMax !== '' ? Number(salaryMax) : undefined,
        salaryCurrency: salaryMode === 'range' ? salaryCurrency : undefined,
        salaryVisibility: salaryMode === 'range',
      });
      return employerApi.submitJob(companyId!, job.id);
    },
    onSuccess: (job) => {
      setError(null);
      if (job.status === 'published') {
        setMessage('Your job is live on the public board.');
      } else {
        setMessage('Your job was submitted and is under admin review.');
      }
      setTimeout(() => navigate(`/company/${companyId}/jobs`), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    submitMutation.mutate();
  };

  const company = companyQuery.data;

  return (
    <div className="stack">
      <nav className="detail-breadcrumbs">
        <Link to={`/company/${companyId}/jobs`}>← Job postings</Link>
      </nav>

      <div className="page-header">
        <h1>Post job opportunity</h1>
        <p className="muted">
          {company?.name ?? 'Company'} —{' '}
          {company?.canSelfPublishJobs
            ? 'posts go live immediately.'
            : 'posts require admin approval before going live.'}
        </p>
      </div>

      {message && <div className="card" style={{ borderColor: '#16a34a' }}>{message}</div>}
      {error && <div className="alert-box-error">{error}</div>}

      <form className="card stack" onSubmit={handleSubmit}>
        <label>
          Job title *
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Responsibilities *
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select responsibility area</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {categoryId && (
          <label>
            Responsibility description * ({selectedCategory?.name})
            {selectedCategory?.description && (
              <span className="muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {selectedCategory.description}
              </span>
            )}
            <textarea
              required
              rows={3}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
            />
          </label>
        )}
        <label>
          Location
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Optional</option>
            {(locationsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Required Qualifications and Skills
          <textarea rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        </label>
        <label>
          Required Work Experience (years)
          <input
            type="number"
            min={0}
            step={0.5}
            value={experienceMinYears}
            onChange={(e) => setExperienceMinYears(e.target.value ? Number(e.target.value) : '')}
          />
        </label>
        <label>
          Employment type
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </label>
        <label>
          Workplace
          <select value={workplaceType} onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}>
            <option value="on_site">On site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </label>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Salary</legend>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="radio"
                name="salary-mode"
                checked={salaryMode === 'negotiable'}
                onChange={() => setSalaryMode('negotiable')}
              />
              Negotiable
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="radio"
                name="salary-mode"
                checked={salaryMode === 'range'}
                onChange={() => setSalaryMode('range')}
              />
              Specify range
            </label>
          </div>
          {salaryMode === 'range' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              <label>
                Min
                <input type="number" min={0} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : '')} />
              </label>
              <label>
                Max
                <input type="number" min={0} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : '')} />
              </label>
              <label>
                Currency
                <input value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)} />
              </label>
            </div>
          )}
        </fieldset>

        <label>
          Application deadline *
          <input
            type="date"
            required
            value={applicationDeadline}
            onChange={(e) => setApplicationDeadline(e.target.value)}
          />
        </label>
        <label>
          Vacancies
          <input
            type="number"
            min={1}
            value={vacanciesCount}
            onChange={(e) => setVacanciesCount(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="btn" disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Submitting…' : 'Submit job posting'}
        </button>
      </form>
    </div>
  );
};
