import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { employerApi } from '../api/employer';
import { taxonomyApi } from '../api/taxonomy';
import type { ApplicationMethod, EmploymentType, WorkplaceType } from '../types/api';

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

  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('on_site');
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>('internal');
  const [applicationDeadline, setApplicationDeadline] = useState('2026-12-31');
  const [vacanciesCount, setVacanciesCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const job = await employerApi.createJob(companyId!, {
        categoryId,
        locationId: locationId || undefined,
        title,
        description,
        employmentType,
        workplaceType,
        applicationMethod,
        applicationDeadline,
        vacanciesCount: Number(vacanciesCount) || 1,
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
          Title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Category
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
          Description
          <textarea required rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
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
        <label>
          Application method
          <select
            value={applicationMethod}
            onChange={(e) => setApplicationMethod(e.target.value as ApplicationMethod)}
          >
            <option value="internal">In-app apply</option>
            <option value="external_url">External URL</option>
            <option value="email">Email</option>
          </select>
        </label>
        <label>
          Application deadline
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
