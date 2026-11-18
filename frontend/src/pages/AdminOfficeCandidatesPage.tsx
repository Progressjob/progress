import { officeCandidateFieldErrors, focusOfficeField } from '../utils/officeCandidateValidation';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  downloadOfficeTemplate,
  officeCandidatesApi,
  type ImportPreviewRow,
  type OfficeStatus,
} from '../api/officeCandidates';
import { emptyOfficeCandidate, OfficeCandidateForm } from '../components/admin/OfficeCandidateForm';
import { formatEthiopianPhoneDisplay } from '../utils/ethiopianPhone';

const PAGE_SIZE = 8;

function displayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`
    .trim()
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

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
  const [submitted, setSubmitted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(() => !window.matchMedia('(max-width: 768px)').matches);
  const [form, setForm] = useState(emptyOfficeCandidate());
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const listQuery = useQuery({
    queryKey: ['admin', 'office-candidates', debounced, status, page],
    queryFn: () => officeCandidatesApi.list({
      q: debounced || undefined,
      officeStatus: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => officeCandidatesApi.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'office-candidates'] });
    },
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

  const readyCount = preview?.filter((row) => row.status === 'ok').length ?? 0;
  const errorCount = preview?.filter((row) => row.status === 'error').length ?? 0;

  return (
    <div className="stack admin-candidates-screen admin-office-registry-page">
      <div className="page-header">
        <span className="section-eyebrow">Office registry</span>
        <h1>Office candidates</h1>
        <p className="muted">People registered at the office. They are kept separate from website accounts.</p>
      </div>
      <div className="office-page-toolbar">
        <button type="button" className="rec-btn rec-btn-primary office-register-toggle" onClick={() => { setSubmitted(false); createMutation.reset(); setCreating((open) => !open); }}>
          {creating ? 'Close form' : 'Register candidate'}
        </button>
        <button type="button" className="rec-btn rec-btn-soft" onClick={() => fileRef.current?.click()}>
          Import Excel
        </button>
        <button type="button" className="rec-btn rec-btn-soft" onClick={() => void downloadOfficeTemplate()}>
          Download template
        </button>
        <input
          ref={fileRef}
          className="office-file-input"
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setImportFile(file);
            setPreview(null);
            setCreating(false);
            setSubmitted(false);
            commitMutation.reset();
            if (file) previewMutation.mutate(file);
            event.target.value = '';
          }}
        />
      </div>

      {creating && (
        <form
          className="office-register-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            const errors = officeCandidateFieldErrors(form);
            const firstError = Object.keys(errors)[0];
            if (firstError) { focusOfficeField(event.currentTarget, firstError); return; }
            createMutation.mutate();
          }}
        >
          {createMutation.isError && <div className="alert-box-error">{(createMutation.error as Error).message}</div>}
          <div className="office-register-layout">
            <div className="office-register-main">
              <OfficeCandidateForm value={form} onChange={setForm} showErrors={submitted} />
              <div className="office-form-footer">
                <p className="muted">Fields marked * are required.</p>
                <div className="office-form-actions">
                  <button type="button" className="rec-btn rec-btn-soft" disabled={createMutation.isPending} onClick={() => { setCreating(false); setSubmitted(false); createMutation.reset(); }}>Cancel</button>
                  <button type="submit" className="rec-btn rec-btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Saving…' : 'Save office candidate'}
                  </button>
                </div>
              </div>
            </div>
            <details className="office-intake-hints" open={helpOpen} onToggle={(event) => setHelpOpen(event.currentTarget.open)}>
              <summary>Registration help</summary>
              <p className="office-hints-kicker">Admin helper</p>
              <h2>Ask and collect</h2>
              <p className="office-hints-lead">Use this while the candidate is at the desk. Only the basics are needed to register them.</p>
              <h3>Collect</h3>
              <ul>
                <li>Full name, as written on their FAN</li>
                <li>A phone number they actually answer</li>
                <li>National ID FAN number</li>
                <li>Job title, category, grade, and salary — optional, can be added later</li>
                <li>Education, languages, and recent work</li>
                <li>CV file, if they brought one</li>
              </ul>
              <h3>Also ask</h3>
              <ul>
                <li>Can they start now, or are they still negotiating?</li>
                <li>Which city or area can they work in?</li>
                <li>Who should we call in an emergency? A guarantor and bank account can be added later.</li>
                <li>Do they agree Progress may recommend them to employers?</li>
              </ul>
              <p className="office-hints-note">Save first, then open the record to add job and salary or upload the CV. Employers only see the profile you recommend, not the guarantor or emergency details.</p>
            </details>
          </div>
        </form>
      )}

      {(previewMutation.isPending || preview || previewMutation.isError || commitMutation.data) && (
        <section className="office-import-sheet" aria-label="Excel import preview" aria-busy={previewMutation.isPending || commitMutation.isPending}>
          <div className="office-import-title">
            <div><h2>Review Excel import</h2>{importFile && <p>{importFile.name}</p>}</div>
            <button type="button" className="rec-btn rec-btn-soft" disabled={commitMutation.isPending || previewMutation.isPending} onClick={() => { setPreview(null); setImportFile(null); previewMutation.reset(); commitMutation.reset(); }}>Close preview</button>
          </div>
          {previewMutation.isPending && <p className="muted">Reading the file…</p>}
          {previewMutation.isError && <div className="alert-box-error">{(previewMutation.error as Error).message}</div>}
          {preview && (
            <>
              <div className="office-import-head">
                <div className="office-import-counts" role="status"><span className="office-import-ready">{readyCount} ready</span><span className="office-import-fix">{errorCount} need a fix</span></div>
                <button
                  type="button"
                  className="rec-btn rec-btn-primary"
                  disabled={!importFile || commitMutation.isPending || !preview.some((row) => row.status === 'ok')}
                  onClick={() => importFile && commitMutation.mutate(importFile)}
                >
                  {commitMutation.isPending ? 'Importing…' : `Import ${readyCount} candidate${readyCount === 1 ? '' : 's'}`}
                </button>
              </div>
              {errorCount > 0 && <p className="office-import-explainer">Only ready rows will be imported. Correct the other rows in Excel and upload them again.</p>}
              {preview.length === 0 && <p className="office-import-explainer">No candidate rows were found. Use the template and add a candidate below the headings.</p>}
              <ul>
                {preview.map((row) => (
                  <li key={row.row} className={`office-import-row is-${row.status}`}>
                    <div className="office-import-row-heading"><strong>Row {row.row}: {row.preview.name || 'Unnamed'}</strong><span className="office-import-row-status">{row.status === 'ok' ? 'Ready' : 'Needs a fix'}</span></div>
                    <span className="office-import-row-detail">{[row.preview.phone, row.preview.headline].filter(Boolean).join(' · ')}</span>
                    {row.errors.length > 0 && <div className="office-import-errors">{row.errors.map((error, index) => <p key={index}>{error}</p>)}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {commitMutation.data && (
            <p className="muted">Created {commitMutation.data.created}. Skipped {commitMutation.data.skipped}.</p>
          )}
        </section>
      )}

      {!creating && <>
      <div className="office-finder">
        <label className="sr-only" htmlFor="office-search">Search the registry</label>
        <input
          id="office-search"
          value={search}
          placeholder="Search name, phone, location or job"
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="office-finder-status" role="group" aria-label="Filter candidates by status">
          {STATUSES.map((item) => (
            <button key={item.id || 'all'} type="button" aria-pressed={status === item.id} className={status === item.id ? 'selected' : ''} onClick={() => setStatus(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {listQuery.isError && <div className="alert-box-error">{(listQuery.error as Error).message}</div>}
      {deleteMutation.isError && <div className="alert-box-error">{(deleteMutation.error as Error).message}</div>}
      <section className="office-sheet">
        <header>
          <h2>Registry</h2>
          <span>{listQuery.data?.total ?? 0} registered</span>
        </header>
        <ul>
          {(listQuery.data?.items ?? []).map((candidate) => {
            const phone = formatEthiopianPhoneDisplay(candidate.phone) || 'No phone';
            const facts = [
              candidate.city || 'No location',
              candidate.fieldOfStudy || candidate.category || 'No study area',
              phone,
              candidate.headline || 'No job title',
              candidate.hasCv ? 'CV on file' : '',
            ].filter(Boolean);
            const label = STATUSES.find((item) => item.id === candidate.officeStatus)?.label || 'New';
            return (
              <li key={candidate.id}>
                <div className="office-sheet-name">
                  <strong>{displayName(candidate.firstName, candidate.lastName)}</strong>
                  <span className={`office-status-${candidate.officeStatus || 'new'}`}>{label}</span>
                </div>
                <p className="office-row-desktop-facts">{facts.join(' · ')}</p>
                <div className="office-row-mobile-facts">
                  <p className="office-row-job">{candidate.headline || 'Job title not added'}</p>
                  <p className="office-row-contact"><span>{candidate.city || 'Location not added'}</span><span>{phone}</span></p>
                  <p className="office-row-education">{candidate.fieldOfStudy || candidate.category || 'Education not added'}</p>
                </div>
                <div className="office-sheet-actions">
                  <Link to={`/admin/office-candidates/${candidate.id}`}>View</Link>
                  <Link to={`/admin/office-candidates/${candidate.id}?edit=1`}>Edit</Link>
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      const name = displayName(candidate.firstName, candidate.lastName);
                      if (window.confirm(`Delete ${name} from the office registry?`)) deleteMutation.mutate(candidate.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {candidate.hasCv && <span className="office-row-cv">CV on file</span>}
              </li>
            );
          })}
        </ul>
        {listQuery.isSuccess && listQuery.data.items.length === 0 && <p className="office-sheet-empty">No office candidates match this search.</p>}
        {(listQuery.data?.total ?? 0) > PAGE_SIZE && (
          <footer>
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE))}</span>
            <button
              type="button"
              disabled={page >= Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE)}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </footer>
        )}
      </section>
      </>}
    </div>
  );
};
