import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownloadFile } from '../api/client';
import { formatEthiopianPhoneDisplay } from '../utils/ethiopianPhone';
import { officeCandidatesApi, type OfficeCandidateInput, type OfficeStatus } from '../api/officeCandidates';
import { OfficeCandidateForm, officeEducationIssue, officeEmergencyPhoneIssue } from '../components/admin/OfficeCandidateForm';
import { RecommendCandidateModal } from '../components/admin/RecommendCandidateModal';

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  const text = value == null ? '' : String(value).trim();
  if (!text || text === 'Not specified') return null;
  return (
    <div className="rec-fact-cell">
      <dt>{label}</dt>
      <dd>{text}</dd>
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
  const openedEdit = useRef(false);
  const [form, setForm] = useState<OfficeCandidateInput | null>(null);
  const [recommend, setRecommend] = useState(false);
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
    },
  });
  const cvMutation = useMutation({
    mutationFn: (file: File) => officeCandidatesApi.uploadCv(profileId, file),
    onSuccess: (detail) => client.setQueryData(['admin', 'office-candidate', profileId], detail),
  });
  const accessMutation = useMutation({
    mutationFn: () => officeCandidatesApi.issueAccess(profileId),
    onSuccess: setCredentials,
  });

  const detail = detailQuery.data;
  if (detailQuery.isLoading) return <div className="card">Loading office candidate…</div>;
  if (!detail) return <div className="alert-box-error">{(detailQuery.error as Error)?.message || 'Not found'}</div>;
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
          <button type="button" className="rec-btn rec-btn-soft" onClick={() => { setForm(toForm(detail)); setEditing((open) => !open); }}>
            {editing ? 'Close editor' : 'Edit record'}
          </button>
          <button type="button" className="rec-btn rec-btn-soft" disabled={accessMutation.isPending} onClick={() => accessMutation.mutate()}>
            Issue login
          </button>
        </div>
      </header>
      {credentials && (
        <div className="card">
          <strong>Temporary login, shown once</strong>
          <p>Phone: {credentials.phone}</p>
          <p>Password: {credentials.temporaryPassword}</p>
          <p className="muted">They must change this password the first time they sign in.</p>
        </div>
      )}
      {editing && form && (
        <form className="office-register-form" onSubmit={(event) => {
          event.preventDefault();
          if (!form || officeEducationIssue(form) || officeEmergencyPhoneIssue(form)) return;
          saveMutation.mutate();
        }}>
          {saveMutation.isError && <div className="alert-box-error">{(saveMutation.error as Error).message}</div>}
          {form && officeEducationIssue(form) && <div className="alert-box-error">{officeEducationIssue(form)}</div>}
          {form && officeEmergencyPhoneIssue(form) && <div className="alert-box-error">{officeEmergencyPhoneIssue(form)}</div>}
          <OfficeCandidateForm value={form} onChange={setForm} />
          <div className="office-form-footer">
            <p className="muted">Updates the same profile shown below.</p>
            <button type="submit" className="rec-btn rec-btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {!editing && (
        <article className="office-intake-sheet office-profile-sheet">
          <section className="office-form-section">
            <h2>Identity</h2>
            <dl className="rec-facts-grid">
              <Fact label="Phone" value={phone} />
              <Fact label="National ID FAN number" value={detail.nationalId} />
              <Fact label="Sex" value={detail.gender} />
              <Fact label="Date of birth" value={detail.dateOfBirth ? detail.dateOfBirth.slice(0, 10) : ''} />
              <Fact label="Current location" value={detail.city} />
              <Fact label="Consent" value={detail.consentAt ? 'Agreed to be shared' : 'Not recorded'} />
            </dl>
          </section>

          <section className="office-form-section">
            <h2>Job and salary</h2>
            <dl className="rec-facts-grid">
              <Fact label="Job title" value={detail.headline} />
              <Fact label="Status" value={detail.officeStatus} />
              <Fact label="Department" value={text('department')} />
              <Fact label="Category" value={text('category')} />
              <Fact label="Job grade" value={text('jobGrade')} />
              <Fact label="Basic salary (ETB)" value={detail.expectedSalary} />
              <Fact label="Transport" value={text('transportAllowance')} />
              <Fact label="House / other" value={text('houseAllowance')} />
              <Fact label="Mobile allowance" value={text('mobileAllowance')} />
              <Fact label="Food coupon" value={text('foodCoupon')} />
            </dl>
            {detail.summary ? (
              <div className="office-profile-note">
                <h3>Experience in other companies</h3>
                <p>{detail.summary}</p>
              </div>
            ) : null}
          </section>

          <section className="office-form-section">
            <h2>Education and languages</h2>
            <dl className="rec-facts-grid">
              <Fact label="Education level" value={education?.qualification} />
              <Fact label="Stream (field of study)" value={education?.fieldOfStudy} />
              <Fact label="School or university" value={education?.institution} />
              <Fact label="Languages" value={detail.languages.map((language) => language.name).join(', ')} />
            </dl>
          </section>

          <section className="office-form-section">
            <h2>Personal details</h2>
            <dl className="rec-facts-grid">
              <Fact label="Marital status" value={text('maritalStatus')} />
              <Fact label="Place of birth" value={text('placeOfBirth')} />
              <Fact label="Blood group" value={text('bloodGroup')} />
              <Fact label="Mother's name" value={text('motherName')} />
              <Fact label="Emergency contact" value={text('emergencyContactName')} />
              <Fact label="Emergency phone" value={emergencyPhone} />
              <Fact label="Guarantor name" value={text('guarantorName')} />
              <Fact label="Guarantor phone" value={text('guarantorPhone')} />
              <Fact label="Guarantor national ID FAN number" value={text('guarantorNationalId')} />
              <Fact label="Bank account" value={text('bankAccount')} />
            </dl>
            {text('notes') ? (
              <div className="office-profile-note">
                <h3>Notes</h3>
                <p>{text('notes')}</p>
              </div>
            ) : null}
          </section>

          <section className="office-form-section">
            <h2>CV</h2>
            <input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) cvMutation.mutate(file);
            }} />
            {cvMutation.isError && <div className="alert-box-error">{(cvMutation.error as Error).message}</div>}
            {detail.resumes[0] ? (
              <button type="button" className="rec-btn rec-btn-soft" onClick={() => void apiDownloadFile(detail.resumes[0].file.id, detail.resumes[0].file.originalFilename)}>
                Download {detail.resumes[0].file.originalFilename}
              </button>
            ) : <p className="office-field-hint">No CV uploaded yet.</p>}
          </section>
        </article>
      )}

      <section className="office-profile-extra">
        <h2>Matching open jobs</h2>
        {(jobsQuery.data ?? []).map((job) => (
          <article key={job.id}>
            <Link to={`/admin/jobs/${job.id}`}><strong>{job.title}</strong></Link>
            <p>{job.company.name} · {job.category.name} · score {job.score}</p>
          </article>
        ))}
        {jobsQuery.data && !jobsQuery.data.length && <p className="muted">No open jobs match this profile yet.</p>}
      </section>

      <section className="office-profile-extra">
        <h2>Recommendations</h2>
        {detail.recommendations.map((item) => (
          <article key={item.id}>
            <strong>{item.company.name}</strong>
            <p>{item.job?.title || 'No specific job'} · {item.status}</p>
            {item.note && <small>{item.note}</small>}
          </article>
        ))}
        {!detail.recommendations.length && <p className="muted">Not recommended to an employer yet.</p>}
      </section>

      {recommend && (
        <RecommendCandidateModal candidateId={detail.id} candidateName={name} onClose={() => setRecommend(false)} />
      )}
    </div>
  );
};
