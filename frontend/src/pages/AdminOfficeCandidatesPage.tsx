import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  downloadOfficeTemplate,
  officeCandidatesApi,
  type ImportPreviewRow,
  type OfficeStatus,
} from '../api/officeCandidates';
import { emptyOfficeCandidate, OfficeCandidateForm } from '../components/admin/OfficeCandidateForm';

const STATUSES: { id: '' | OfficeStatus; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'ready', label: 'Ready' },
  { id: 'placed', label: 'Placed' },
];

export const AdminOfficeCandidatesPage: React.FC = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'' | OfficeStatus>('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyOfficeCandidate());
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const listQuery = useQuery({
    queryKey: ['admin', 'office-candidates', debounced, status],
    queryFn: () => officeCandidatesApi.list({ q: debounced || undefined, officeStatus: status || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: () => officeCandidatesApi.create(form),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: ['admin', 'office-candidates'] });
      navigate(`/admin/office-candidates/${created.id}`);
    },
  });

  const previewMutation = useMutation({
    mutationFn: (file: File) => officeCandidatesApi.previewImport(file),
    onSuccess: (result) => setPreview(result.rows),
  });
  const commitMutation = useMutation({
    mutationFn: (file: File) => officeCandidatesApi.commitImport(file),
    onSuccess: () => {
      setImportFile(null);
      setPreview(null);
      void client.invalidateQueries({ queryKey: ['admin', 'office-candidates'] });
    },
  });

  return (
    <div className="stack admin-candidates-screen">
      <div className="page-header">
        <span className="section-eyebrow">Office registry</span>
        <h1>Office candidates</h1>
        <p className="muted">People registered at the office. They are kept separate from website accounts.</p>
      </div>
      <div className="directory-company-actions">
        <button type="button" onClick={() => setCreating((open) => !open)}>
          {creating ? 'Close form' : 'Register walk-in'}
        </button>
        <button type="button" onClick={() => void downloadOfficeTemplate()}>Download Excel template</button>
      </div>

      {creating && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          {createMutation.isError && <div className="alert-box-error">{(createMutation.error as Error).message}</div>}
          <OfficeCandidateForm value={form} onChange={setForm} />
          <button type="submit" disabled={createMutation.isPending || !form.consent}>
            {createMutation.isPending ? 'Saving…' : 'Save office candidate'}
          </button>
        </form>
      )}

      <section className="card stack">
        <h2>Import Excel</h2>
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setImportFile(file);
            setPreview(null);
            if (file) previewMutation.mutate(file);
          }}
        />
        {previewMutation.isError && <div className="alert-box-error">{(previewMutation.error as Error).message}</div>}
        {preview && (
          <>
            <p className="muted">{preview.filter((row) => row.status === 'ok').length} ready, {preview.filter((row) => row.status === 'error').length} need a fix.</p>
            <div className="admin-company-directory">
              {preview.map((row) => (
                <article className="admin-candidate-row" key={row.row}>
                  <div>
                    <strong>Row {row.row}: {row.preview.name || 'Unnamed'}</strong>
                    <p>{row.preview.phone} {row.preview.headline}</p>
                    {row.errors.length > 0 && <small>{row.errors.join(', ')}</small>}
                  </div>
                  <span className={`verification-state ${row.status === 'ok' ? 'verified' : 'rejected'}`}>{row.status}</span>
                </article>
              ))}
            </div>
            <button
              type="button"
              disabled={!importFile || commitMutation.isPending || !preview.some((row) => row.status === 'ok')}
              onClick={() => importFile && commitMutation.mutate(importFile)}
            >
              {commitMutation.isPending ? 'Importing…' : 'Import valid rows'}
            </button>
            {commitMutation.data && (
              <p>Created {commitMutation.data.created}. Skipped {commitMutation.data.skipped}.</p>
            )}
          </>
        )}
      </section>

      <div className="form-input-group" style={{ maxWidth: '420px' }}>
        <label htmlFor="office-search">Search name, phone, FAN or job title</label>
        <input id="office-search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="admin-page-tabs">
        {STATUSES.map((item) => (
          <button key={item.id || 'all'} type="button" className={status === item.id ? 'selected' : ''} onClick={() => setStatus(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {listQuery.isError && <div className="alert-box-error">{(listQuery.error as Error).message}</div>}
      <div className="admin-company-directory">
        {(listQuery.data ?? []).map((candidate) => (
          <article className="admin-candidate-row" key={candidate.id}>
            <div>
              <h2>{candidate.firstName} {candidate.lastName}</h2>
              <p>{candidate.headline || 'No job title'}</p>
              <small>{candidate.phone} {candidate.city ? `· ${candidate.city}` : ''}</small>
            </div>
            <span className="verification-state verified">{candidate.officeStatus || 'new'}</span>
            <div className="directory-company-actions">
              <Link to={`/admin/office-candidates/${candidate.id}`}>Open</Link>
              {candidate.hasCv && <small>CV on file</small>}
            </div>
          </article>
        ))}
        {!listQuery.isLoading && !(listQuery.data ?? []).length && <div className="admin-empty">No office candidates yet.</div>}
      </div>
    </div>
  );
};
