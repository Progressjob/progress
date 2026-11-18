import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { recommendationsApi } from '../../api/recommendations';

export const RecommendCandidateModal: React.FC<{
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}> = ({ candidateId, candidateName, onClose }) => {
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');

  const companiesQuery = useQuery({
    queryKey: ['admin', 'companies', 'recommend'],
    queryFn: () => adminApi.listCompanies(),
  });
  const jobsQuery = useQuery({
    queryKey: ['admin', 'jobs', 'recommend', companyId],
    queryFn: () => adminApi.listJobs({ companyId, status: 'published', pageSize: 50 }),
    enabled: Boolean(companyId),
  });

  const openJobs = (jobsQuery.data?.items ?? []).filter((job) => {
    if (job.status !== 'published') return false;
    const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline >= today;
  });
  const companyHasNoOpenPost = Boolean(companyId) && jobsQuery.isSuccess && openJobs.length === 0;

  const mutation = useMutation({
    mutationFn: () =>
      recommendationsApi.create({
        candidateId,
        companyId,
        jobId: jobId || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: onClose,
  });

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 40 }}
    >
      <div className="card stack" role="dialog" aria-labelledby="recommend-title" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)' }}>
        <h2 id="recommend-title">Recommend {candidateName}</h2>
        <p className="muted">The employer gets a notification and can open this profile.</p>
        {mutation.isError && <div className="alert-box-error">{(mutation.error as Error).message}</div>}
        <div className="form-input-group">
          <label htmlFor="rec-company">Company</label>
          <select
            id="rec-company"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setJobId('');
            }}
          >
            <option value="">Select a company</option>
            {(companiesQuery.data ?? []).map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div className="form-input-group">
          <label htmlFor="rec-job">Open job</label>
          <select id="rec-job" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={!companyId || companyHasNoOpenPost}>
            <option value="">{companyHasNoOpenPost ? 'No open job posts' : 'Any open post at this company'}</option>
            {openJobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          {companyHasNoOpenPost ? (
            <p className="office-field-error">This company’s posts are closed. Pick a company with an open job.</p>
          ) : null}
        </div>
        <div className="form-input-group">
          <label htmlFor="rec-note">Note to the employer</label>
          <textarea id="rec-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="directory-company-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" disabled={!companyId || companyHasNoOpenPost || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Sending…' : 'Send recommendation'}
          </button>
        </div>
      </div>
    </div>
  );
};
