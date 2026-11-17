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
    queryFn: () => adminApi.listJobs({ companyId, pageSize: 50 }),
    enabled: Boolean(companyId),
  });

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
          <label htmlFor="rec-job">Job (optional)</label>
          <select id="rec-job" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={!companyId}>
            <option value="">No specific job</option>
            {(jobsQuery.data?.items ?? []).map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
        <div className="form-input-group">
          <label htmlFor="rec-note">Note to the employer</label>
          <textarea id="rec-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="directory-company-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" disabled={!companyId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Sending…' : 'Send recommendation'}
          </button>
        </div>
      </div>
    </div>
  );
};
