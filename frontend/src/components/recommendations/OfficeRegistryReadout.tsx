import React, { useState } from 'react';
import { candidateDate, formatCandidateAmount } from '../../utils/candidatePresentation';
import type { OfficeRecommendationRegistry, TalentDetail } from '../../types/api';
import { apiDownloadFile } from '../../api/client';
import { PROGRESS_HIRE_EMAIL, PROGRESS_MOBILE_PHONES } from '../../constants/progressContact';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="rec-fact-cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function birthLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) years -= 1;
  const shown = date.toLocaleDateString();
  return years >= 0 ? `${shown} · ${years} years` : shown;
}

function schoolName(value: string | null | undefined) {
  const text = value?.trim();
  if (!text || text === 'Not specified') return '';
  return text;
}

export const OfficeRegistryReadout: React.FC<{
  profile: TalentDetail;
  registry: OfficeRecommendationRegistry;
}> = ({ profile, registry }) => {
  const resumes = registry.resumes.length ? registry.resumes : profile.resume ? [profile.resume] : [];
  const location = [profile.city, profile.region, profile.country].filter(Boolean).join(', ');
  const salary = formatCandidateAmount(registry.expectedSalary, registry.salaryCurrency || '');
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string } | null>(null);
  const download = async (file: (typeof resumes)[number]) => {
    setDownloadId(file.id);
    setDownloadError(null);
    try { await apiDownloadFile(file.fileId, file.originalFilename || 'cv.pdf'); }
    catch (error) { setDownloadError({ id: file.id, message: (error as Error).message }); }
    finally { setDownloadId(null); }
  };

  return (
    <div className="rec-office-registry stack">
      <p className="muted rec-office-lead">Reach this candidate through Progress. Their phone and email are not shown here.</p>
      {(location || registry.gender || registry.dateOfBirth || salary) && <dl className="rec-facts-grid">
        <Field label="Location" value={location} /><Field label="Gender" value={registry.gender} />
        <Field label="Date of birth" value={birthLabel(registry.dateOfBirth)} /><Field label="Expected salary" value={salary} />
      </dl>}
      {(profile.summary || profile.experiences.length > 0) && <div className="rec-registry-block">
        <h3>Experience</h3>{profile.summary && <p>{profile.summary}</p>}
        {profile.experiences.length > 0 && <ul className="rec-qualification-list">{profile.experiences.map((item) => <li key={item.id}>
          <h4>{item.jobTitle}</h4><p>{item.companyName}{item.workingCity ? ` · ${item.workingCity}` : ''}</p>
          <p className="muted">{candidateDate(item.startDate)} – {item.isCurrent ? 'Present' : candidateDate(item.endDate) || 'End date not recorded'}</p>
          {item.description && <p>{item.description}</p>}
        </li>)}</ul>}
      </div>}
      {profile.educations.length > 0 && <div className="rec-registry-block">
        <h3>Education</h3><ul className="rec-qualification-list">{profile.educations.map((item) => <li key={item.id}>
          <h4>{item.qualification || 'Education'}</h4>{item.fieldOfStudy && <p>{item.fieldOfStudy}</p>}
          {schoolName(item.institution) && <p className="muted">{schoolName(item.institution)}</p>}
        </li>)}</ul>
      </div>}
      {profile.languages.length > 0 && <div className="rec-registry-block">
        <h3>Languages</h3><ul className="rec-profile-tags">{profile.languages.map((item) => <li key={item.id || item.name}>{item.name}{item.proficiency ? ` · ${item.proficiency}` : ''}</li>)}</ul>
      </div>}
      {profile.skills.length > 0 && <div className="rec-registry-block">
        <h3>Skills</h3><ul className="rec-profile-tags">{profile.skills.map((item) => <li key={item.skillId}>{item.skill.name}{item.proficiencyLevel ? ` · ${item.proficiencyLevel}` : ''}</li>)}</ul>
      </div>}
      {profile.certifications.length > 0 && <div className="rec-registry-block">
        <h3>Certificates</h3><ul className="rec-qualification-list">{profile.certifications.map((item) => <li key={item.id}><h4>{item.name}</h4>{item.issuer && <p>{item.issuer}</p>}</li>)}</ul>
      </div>}
      <div id="recommendation-cv" className="rec-registry-block">
        <h3>CV</h3>{resumes.length ? <ul className="rec-registry-list">{resumes.map((file) => <li key={file.id}>
          <p className="rec-resume-filename">{file.originalFilename || file.title || 'CV'}</p>
          {downloadError?.id === file.id && <p className="office-field-error" role="alert">{downloadError.message}</p>}
          <button type="button" className="rec-btn rec-btn-soft" disabled={downloadId !== null} onClick={() => void download(file)}>
            {downloadId === file.id ? 'Downloading…' : downloadError?.id === file.id ? 'Try download again' : 'Download CV'}
          </button>
        </li>)}</ul> : <p className="muted">No CV uploaded yet. Contact Progress to ask for further information.</p>}
      </div>
      <div id="recommendation-contact" className="rec-registry-block rec-office-contact">
        <h3>Contact via Progress</h3><div className="rec-contact-links">
          {PROGRESS_MOBILE_PHONES.map((phone) => <a key={phone} href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>)}
          <a className="rec-contact-email" href={`mailto:${PROGRESS_HIRE_EMAIL}`}>{PROGRESS_HIRE_EMAIL}</a>
        </div>
      </div>
    </div>
  );
};
