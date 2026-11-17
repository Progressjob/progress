import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownloadFile } from '../api/client';
import { officeCandidatesApi, type OfficeCandidateInput, type OfficeStatus } from '../api/officeCandidates';
import { OfficeCandidateForm } from '../components/admin/OfficeCandidateForm';
import { RecommendCandidateModal } from '../components/admin/RecommendCandidateModal';

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
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
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
  const name = `${detail.user.firstName} ${detail.user.lastName}`;

  return (
    <div className="stack">
      <Link to="/admin/office-candidates">Back to office candidates</Link>
      <div className="page-header">
        <span className="section-eyebrow">Office candidate</span>
        <h1>{name}</h1>
        <p className="muted">{detail.headline || 'No job title'} · {detail.officeStatus || 'new'}</p>
      </div>
      <div className="directory-company-actions">
        <button type="button" onClick={() => setRecommend(true)}>Recommend to employer</button>
        <button type="button" onClick={() => { setForm(toForm(detail)); setEditing((open) => !open); }}>
          {editing ? 'Close editor' : 'Edit record'}
        </button>
        <button type="button" disabled={accessMutation.isPending} onClick={() => accessMutation.mutate()}>
          Issue login
        </button>
      </div>
      {credentials && (
        <div className="card">
          <strong>Temporary login, shown once</strong>
          <p>Phone: {credentials.phone}</p>
          <p>Password: {credentials.temporaryPassword}</p>
          <p className="muted">They must change this password the first time they sign in.</p>
        </div>
      )}
      {editing && form && (
        <form className="stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          {saveMutation.isError && <div className="alert-box-error">{(saveMutation.error as Error).message}</div>}
          <OfficeCandidateForm value={form} onChange={setForm} />
          <button type="submit" disabled={saveMutation.isPending}>Save changes</button>
        </form>
      )}

      <section className="card stack">
        <h2>Profile</h2>
        <p>Phone {detail.user.phone || '—'} · FAN {detail.nationalId || '—'} · {detail.city || 'Location not set'}</p>
        <p>Consent {detail.consentAt ? 'recorded' : 'not recorded'}</p>
        <p>{detail.summary || 'No experience notes yet.'}</p>
        {detail.educations[0] && (
          <p>{detail.educations[0].qualification} · {detail.educations[0].fieldOfStudy} · {detail.educations[0].institution}</p>
        )}
        <p>Languages: {detail.languages.map((language) => language.name).join(', ') || '—'}</p>
      </section>

      <section className="card stack">
        <h2>CV</h2>
        <input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) cvMutation.mutate(file);
        }} />
        {cvMutation.isError && <div className="alert-box-error">{(cvMutation.error as Error).message}</div>}
        {detail.resumes[0] ? (
          <button type="button" onClick={() => void apiDownloadFile(detail.resumes[0].file.id, detail.resumes[0].file.originalFilename)}>
            Download {detail.resumes[0].file.originalFilename}
          </button>
        ) : <p className="muted">No CV uploaded.</p>}
      </section>

      <section className="card stack">
        <h2>Matching open jobs</h2>
        {(jobsQuery.data ?? []).map((job) => (
          <article key={job.id}>
            <Link to={`/admin/jobs/${job.id}`}><strong>{job.title}</strong></Link>
            <p>{job.company.name} · {job.category.name} · score {job.score}</p>
          </article>
        ))}
        {jobsQuery.data && !jobsQuery.data.length && <p className="muted">No open jobs match this profile yet.</p>}
      </section>

      <section className="card stack">
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
