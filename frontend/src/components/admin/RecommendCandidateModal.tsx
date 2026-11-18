import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { recommendationsApi } from '../../api/recommendations';

export const RecommendCandidateModal: React.FC<{
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}> = ({ candidateId, candidateName, onClose }) => {
  const client = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

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
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'office-candidate', candidateId] });
      void client.invalidateQueries({ queryKey: ['company', companyId, 'recommendations'] });
      onClose();
    },
  });

  return createPortal(
    <div
      className="office-recommend-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommend-title"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), textarea, input, a[href]');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
    >
      <div ref={dialog} className="card office-recommend-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="recommend-title">Recommend {candidateName}</h2>
        <p className="muted">The employer gets a notification and can open this profile.</p>
        {(companiesQuery.isError || jobsQuery.isError) && <p className="office-field-error" role="alert">Companies or jobs could not be loaded. Close this dialog and try again.</p>}
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
        <div className="office-recommend-actions">
          <button type="button" className="rec-btn rec-btn-soft" onClick={onClose}>Cancel</button>
          <button type="button" className="rec-btn rec-btn-primary" disabled={!companyId || jobsQuery.isPending || jobsQuery.isError || companyHasNoOpenPost || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Sending…' : 'Send recommendation'}
          </button>
        </div>
      </div>
    </div>, document.body
  );
};
