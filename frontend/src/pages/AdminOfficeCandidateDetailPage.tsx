import { candidateDate, formatCandidateAmount, recommendationStatus } from '../utils/candidatePresentation';
import { officeCandidateFieldErrors, focusOfficeField } from '../utils/officeCandidateValidation';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownloadFile } from '../api/client';
import { formatEthiopianPhoneDisplay } from '../utils/ethiopianPhone';
import { officeCandidatesApi, type OfficeCandidateInput, type OfficeStatus } from '../api/officeCandidates';
import { OfficeCandidateForm } from '../components/admin/OfficeCandidateForm';
import { RecommendCandidateModal } from '../components/admin/RecommendCandidateModal';

function Fact({ label, value, wide = false, href }: { label: string; value?: string | number | null; wide?: boolean; href?: string }) {
  const text = value == null ? '' : String(value).trim();
  if (!text || text === 'Not specified') return null;
  return (
    <div className={`rec-fact-cell${wide ? ' office-fact-wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{href ? <a href={href}>{text}</a> : text}</dd>
    </div>
  );
}

function toForm(detail: Awaited<ReturnType<typeof officeCandidatesApi.get>>): OfficeCandidateInput {
  const education = detail.educations[0];
  const record = detail.officeRecord ?? {};
  const text = (key: string) => (record[key] == null ? '' : String(record[key]));
  return {
    firstName: detail.user.firstName,
    lastName: detail.user.lastName,
    phone: detail.user.phone ?? '',
    nationalId: detail.nationalId ?? '',
    headline: detail.headline ?? '',
    gender: detail.gender ?? '',
    dateOfBirth: detail.dateOfBirth ? detail.dateOfBirth.slice(0, 10) : '',
    city: detail.city ?? '',
    summary: detail.summary ?? '',
    expectedSalary: detail.expectedSalary == null ? undefined : Number(detail.expectedSalary),
    consent: Boolean(detail.consentAt),
    officeStatus: (detail.officeStatus ?? 'new') as OfficeStatus,
    qualification: education?.qualification ?? '',
    fieldOfStudy: education?.fieldOfStudy ?? '',
    institution: education?.institution === 'Not specified' ? '' : education?.institution ?? '',
    languages: detail.languages.map((language) => language.name).join(', '),
    department: text('department'),
    category: text('category'),
    jobGrade: text('jobGrade'),
    transportAllowance: text('transportAllowance'),
    houseAllowance: text('houseAllowance'),
    mobileAllowance: text('mobileAllowance'),
    foodCoupon: text('foodCoupon'),
    maritalStatus: text('maritalStatus'),
    placeOfBirth: text('placeOfBirth'),
    bloodGroup: text('bloodGroup'),
    motherName: text('motherName'),
    emergencyContactName: text('emergencyContactName'),
    emergencyRelationship: text('emergencyRelationship'),
    emergencyPhone: text('emergencyPhone'),
    guarantorName: text('guarantorName'),
    guarantorPhone: text('guarantorPhone'),
    guarantorNationalId: text('guarantorNationalId'),
    bankAccount: text('bankAccount'),
    notes: text('notes'),
  };
}

export const AdminOfficeCandidateDetailPage: React.FC = () => {
  const { profileId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const openedEdit = useRef(false);
  const [form, setForm] = useState<OfficeCandidateInput | null>(null);
  const [recommend, setRecommend] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ phone: string | null; temporaryPassword: string } | null>(null);

  const detailQuery = useQuery({
    queryKey: ['admin', 'office-candidate', profileId],
    queryFn: () => officeCandidatesApi.get(profileId),
    enabled: Boolean(profileId),
  });
  const jobsQuery = useQuery({
    queryKey: ['admin', 'office-candidate', profileId, 'jobs'],
    queryFn: () => officeCandidatesApi.matchingJobs(profileId),
    enabled: Boolean(profileId),
  });

  useEffect(() => {
    if (openedEdit.current || searchParams.get('edit') !== '1' || !detailQuery.data) return;
    openedEdit.current = true;
    setForm(toForm(detailQuery.data));
    setEditing(true);
  }, [detailQuery.data, searchParams]);

  const saveMutation = useMutation({
    mutationFn: () => officeCandidatesApi.update(profileId, form!),
    onSuccess: (detail) => {
      client.setQueryData(['admin', 'office-candidate', profileId], detail);
      setEditing(false);
      setFeedback('Candidate record updated.');
    },
  });
  const cvMutation = useMutation({
    mutationFn: (file: File) => officeCandidatesApi.uploadCv(profileId, file),
    onSuccess: (detail) => { client.setQueryData(['admin', 'office-candidate', profileId], detail); setFeedback('CV updated.'); },
  });
  const accessMutation = useMutation({
    mutationFn: () => officeCandidatesApi.issueAccess(profileId),
    onSuccess: setCredentials,
  });

  const detail = detailQuery.data;
  if (detailQuery.isLoading) return <div className="card">Loading office candidate…</div>;
  if (!detail) return <div className="alert-box-error">{(detailQuery.error as Error)?.message || 'Not found'} <button type="button" onClick={() => void detailQuery.refetch()}>Try again</button></div>;
  const name = `${detail.user.firstName} ${detail.user.lastName}`
    .trim()
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
  const record = detail.officeRecord ?? {};
  const text = (key: string) => (record[key] == null ? '' : String(record[key]));
  const education = detail.educations[0];
  const phone = formatEthiopianPhoneDisplay(detail.user.phone) || detail.user.phone || '';
  const emergencyPhone = formatEthiopianPhoneDisplay(text('emergencyPhone')) || text('emergencyPhone');

  return (
    <div className="office-profile-page">
      <Link to="/admin/office-candidates" className="office-profile-back">Back to office candidates</Link>
      <header className="office-profile-head">
        <div>
          <span className="section-eyebrow">Office candidate</span>
          <div className="rec-page-title-row">
            <h1>{name}</h1>
            <span className="rec-status-pill is-viewed">{detail.officeStatus || 'new'}</span>
          </div>
          <p className="muted rec-page-sub">{detail.headline || 'Job title not added yet'}</p>
        </div>
        <div className="office-page-toolbar">
          <button type="button" className="rec-btn rec-btn-primary" onClick={() => setRecommend(true)}>Recommend</button>
          <button type="button" className="rec-btn rec-btn-soft" onClick={() => { setSubmitted(false); setForm(toForm(detail)); setRecommendedOpen(false); setEditing((open) => !open); }}>
            {editing ? 'Close editor' : 'Edit record'}
          </button>
          <button type="button" className="rec-btn rec-btn-soft" disabled={accessMutation.isPending} onClick={() => accessMutation.mutate()}>
            {accessMutation.isPending ? 'Generating login…' : 'Issue login'}
          </button>
          <button type="button" className={`rec-btn rec-btn-soft${recommendedOpen ? ' is-open' : ''}`} aria-expanded={recommendedOpen} aria-controls="office-recommendation-history" onClick={() => setRecommendedOpen((open) => !open)}>
            Recommended to{detail.recommendations.length ? ` (${detail.recommendations.length})` : ''}
          </button>
        </div>
      </header>
      {feedback && <p className="record-feedback" role="status">{feedback}</p>}
      {accessMutation.isError && <div className="record-error" role="alert"><p>{(accessMutation.error as Error).message}</p><button type="button" className="rec-btn rec-btn-soft" onClick={() => accessMutation.mutate()}>Try again</button></div>}
      {!recommendedOpen && !editing && <nav className="record-section-nav" aria-label="Candidate record sections">
        <a href="#office-identity">Identity</a><a href="#office-job">Job &amp; salary</a><a href="#office-education">Education</a><a href="#office-personal">Personal</a><a href="#office-contacts">Contacts</a><a href="#office-cv">CV</a>
      </nav>}
      {recommendedOpen && (
        <section id="office-recommendation-history" className="office-profile-extra office-recommended-panel">
          <div className="record-panel-heading"><h2>Recommended to</h2><button type="button" className="rec-btn rec-btn-soft" onClick={() => setRecommendedOpen(false)}>Back to record</button></div>
          {detail.recommendations.map((item) => (
            <article key={item.id}>
              <div className="record-history-heading"><strong>{item.company.name}</strong><span className={`rec-status-pill is-${item.status}`}>{recommendationStatus(item.status)}</span></div>
              <p>{item.job?.title || 'Any open post'}</p>
              <time dateTime={item.createdAt}>{candidateDate(item.createdAt)}</time>
              {item.note && <p className="record-history-note">{item.note}</p>}
            </article>
          ))}
          {!detail.recommendations.length && <p className="muted">Not recommended to an employer yet.</p>}
        </section>
      )}
      {!recommendedOpen && credentials && (
        <div className="card office-issued-login">
          <strong>Temporary login, shown once</strong>
          <p>Phone: {credentials.phone}</p>
          <p>Password: {credentials.temporaryPassword}</p>
          <p className="muted">Give these details directly to the candidate. They must change this password the first time they sign in.</p>
          <button type="button" className="rec-btn rec-btn-soft" onClick={() => setCredentials(null)}>Dismiss login details</button>
        </div>
      )}
      {!recommendedOpen && editing && form && (
        <form className="office-register-form" noValidate onSubmit={(event) => {
          event.preventDefault();
          if (!form) return;
          setSubmitted(true);
          const firstError = Object.keys(officeCandidateFieldErrors(form, false))[0];
          if (firstError) { focusOfficeField(event.currentTarget, firstError); return; }
          saveMutation.mutate();
        }}>
          <h2 className="record-editor-heading">Edit candidate record</h2>
          {saveMutation.isError && <div className="alert-box-error">{(saveMutation.error as Error).message}</div>}
          <OfficeCandidateForm value={form} onChange={setForm} showErrors={submitted} requireConsent={false} />
          <div className="office-form-footer office-edit-footer">
            <p className="muted">Changes are saved only when you select Save changes.</p>
            <div className="record-editor-actions"><button type="button" className="rec-btn rec-btn-soft" disabled={saveMutation.isPending} onClick={() => { setEditing(false); setSubmitted(false); setForm(null); saveMutation.reset(); }}>Cancel editing</button>
            <button type="submit" className="rec-btn rec-btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save changes'}</button></div>
          </div>
        </form>
      )}

      {!recommendedOpen && !editing && (
        <article className="office-intake-sheet office-profile-sheet">
          <section id="office-identity" className="office-form-section">
            <h2>Identity</h2>
            <dl className="rec-facts-grid">
              <Fact label="Phone" value={phone} href={detail.user.phone ? `tel:${detail.user.phone}` : undefined} />
              <Fact label="National ID FAN number" value={detail.nationalId} />
              <Fact label="Sex" value={detail.gender} />
              <Fact label="Date of birth" value={detail.dateOfBirth ? detail.dateOfBirth.slice(0, 10) : ''} />
              <Fact label="Current location" value={detail.city} />
              <Fact label="Consent" value={detail.consentAt ? 'Agreed to be shared' : 'Not recorded'} />
            </dl>
          </section>

          <section id="office-job" className="office-form-section">
            <h2>Job and salary</h2>
            <dl className="rec-facts-grid">
              <Fact label="Job title" value={detail.headline} wide />
              <Fact label="Status" value={detail.officeStatus} />
              <Fact label="Department" value={text('department')} />
              <Fact label="Category" value={text('category')} />
              <Fact label="Job grade" value={text('jobGrade')} />
              <Fact label="Basic salary" value={formatCandidateAmount(detail.expectedSalary)} />
              <Fact label="Transport" value={formatCandidateAmount(text('transportAllowance'))} />
              <Fact label="House / other" value={formatCandidateAmount(text('houseAllowance'))} />
              <Fact label="Mobile allowance" value={formatCandidateAmount(text('mobileAllowance'))} />
              <Fact label="Food coupon" value={formatCandidateAmount(text('foodCoupon'))} />
            </dl>
            {detail.summary ? (
              <div className="office-profile-note">
                <h3>Experience in other companies</h3>
                <p>{detail.summary}</p>
              </div>
            ) : null}
          </section>

          <section id="office-education" className="office-form-section">
            <h2>Education and languages</h2>
            <dl className="rec-facts-grid">
              <Fact label="Education level" value={education?.qualification} />
              <Fact label="Stream (field of study)" value={education?.fieldOfStudy} wide />
              <Fact label="School or university" value={education?.institution} wide />
              <Fact label="Languages" value={detail.languages.map((language) => language.name).join(', ')} />
            </dl>
          </section>

          <section id="office-personal" className="office-form-section">
            <h2>Personal details</h2>
            <dl className="rec-facts-grid">
              <Fact label="Marital status" value={text('maritalStatus')} />
              <Fact label="Place of birth" value={text('placeOfBirth')} />
              <Fact label="Blood group" value={text('bloodGroup')} />
              <Fact label="Mother's name" value={text('motherName')} />
              <Fact label="Bank account" value={text('bankAccount')} />
            </dl>
            <div id="office-contacts" className="office-contact-groups">
              <section><h3>Emergency contact</h3><dl className="rec-facts-grid"><Fact label="Emergency contact" value={text('emergencyContactName')} /><Fact label="Emergency phone" value={emergencyPhone} href={text('emergencyPhone') ? `tel:${text('emergencyPhone')}` : undefined} /><Fact label="Relationship" value={text('emergencyRelationship')} /></dl></section>
              <section><h3>Guarantor</h3><dl className="rec-facts-grid"><Fact label="Guarantor name" value={text('guarantorName')} /><Fact label="Guarantor phone" value={text('guarantorPhone')} href={text('guarantorPhone') ? `tel:${text('guarantorPhone')}` : undefined} /><Fact label="Guarantor national ID FAN number" value={text('guarantorNationalId')} /></dl></section>
            </div>
            {text('notes') ? (
              <div className="office-profile-note">
                <h3>Notes</h3>
                <p>{text('notes')}</p>
              </div>
            ) : null}
          </section>

          <section id="office-cv" className="office-form-section office-profile-cv">
            <h2>CV</h2>
            <label className="office-cv-upload-label" htmlFor="office-profile-cv">{detail.resumes[0] ? 'Replace CV' : 'Upload CV'}</label>
            <input id="office-profile-cv" disabled={cvMutation.isPending} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) cvMutation.mutate(file);
            }} />
            {cvMutation.isPending && <p className="office-field-hint" role="status">Uploading CV…</p>}
            {cvMutation.isError && <div className="alert-box-error">{(cvMutation.error as Error).message}</div>}
            {detail.resumes[0] ? (
              <div className="office-cv-file">
                <p>{detail.resumes[0].file.originalFilename}</p>
                <button type="button" className="rec-btn rec-btn-soft" disabled={downloading} onClick={async () => { setDownloading(true); setDownloadError(''); try { await apiDownloadFile(detail.resumes[0].file.id, detail.resumes[0].file.originalFilename); } catch (error) { setDownloadError((error as Error).message); } finally { setDownloading(false); } }}>{downloading ? 'Downloading…' : downloadError ? 'Try download again' : 'Download CV'}</button>
                {downloadError && <p className="office-field-error" role="alert">{downloadError}</p>}
              </div>
            ) : <p className="office-field-hint">No CV uploaded yet.</p>}
          </section>
        </article>
      )}

      {!recommendedOpen && <section className="office-profile-extra">
        <h2>Matching open jobs</h2>
        {jobsQuery.isLoading && <p role="status">Finding matching jobs…</p>}
        {jobsQuery.isError && <div className="record-error" role="alert"><p>Matching jobs could not be loaded.</p><button type="button" className="rec-btn rec-btn-soft" onClick={() => void jobsQuery.refetch()}>Try matching jobs again</button></div>}
        {(jobsQuery.data ?? []).map((job) => (
          <article key={job.id}>
            <Link to={`/admin/jobs/${job.id}`}><strong>{job.title}</strong></Link>
            <p>{job.company.name} · {job.category.name} · score {job.score}</p>
          </article>
        ))}
        {jobsQuery.data && !jobsQuery.data.length && <p className="muted">No open jobs match this profile yet.</p>}
      </section>}

      {recommend && (
        <RecommendCandidateModal candidateId={detail.id} candidateName={name} onClose={() => setRecommend(false)} />
      )}
    </div>
  );
};
