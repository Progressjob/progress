import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicFileUrl } from '../api/files';
import { apiDownloadFile, apiOpenFile } from '../api/client';
import type { TalentDetail } from '../types/api';
import { useTalentPortal } from '../utils/talentPortal';

function talentLocation(profile: TalentDetail): string {
  return [profile.city, profile.region, profile.country].filter(Boolean).join(', ') || 'Ethiopia';
}

function formatYears(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `${shown} year${n === 1 ? '' : 's'}`;
}

function formatRange(start?: string | null, end?: string | null, current?: boolean): string {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (!start) return current ? 'Current' : '';
  if (current) return `${fmt(start)} – Present`;
  if (!end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export const CompanyCvDetailPage: React.FC = () => {
  const portal = useTalentPortal();
  const candidateId = portal.candidateId;

  const profileQuery = useQuery({
    queryKey: ['talent', 'detail', portal.isAdmin ? 'admin' : portal.companyId, candidateId],
    queryFn: () => portal.get(candidateId!),
    enabled: portal.canQuery && Boolean(candidateId),
  });

  if (!portal.canQuery || !candidateId) {
    return <div className="card">This profile could not be opened.</div>;
  }

  if (profileQuery.isLoading) return <div className="card">Loading CV…</div>;
  if (profileQuery.isError) {
    return (
      <div className="stack">
        <Link to={portal.listPath} className="muted">
          ← Back to CV search
        </Link>
        <div className="alert-box-error">{(profileQuery.error as Error).message}</div>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) return null;

  const photo = profile.photoFileId ? publicFileUrl(profile.photoFileId) : null;
  const years = formatYears(profile.yearsExperience);
  const resume = profile.resume;

  const openResume = async () => {
    if (!resume) return;
    await apiOpenFile(resume.fileId);
  };

  const downloadResume = async () => {
    if (!resume) return;
    await apiDownloadFile(resume.fileId, resume.originalFilename || `${profile.firstName}-cv`);
  };

  return (
    <div className="cv-detail-page stack">
      <Link to={portal.listPath} className="cv-back">
        ← Back to CV search
      </Link>

      <section className="card">
        <div className="cv-detail-identity">
          {photo ? (
            <img className="cv-detail-photo" src={photo} alt="" />
          ) : (
            <div className="cv-detail-photo cv-card-photo-fallback" aria-hidden>
              {`${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase()}
            </div>
          )}
          <div>
            <h1>
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="cv-card-role">{profile.currentTitle || profile.headline || 'Professional'}</p>
            <p className="muted">
              {talentLocation(profile)}
              {profile.gender ? ` · ${profile.gender}` : ''}
              {years ? ` · ${years} experience` : ''}
            </p>
          </div>
        </div>
        <dl className="cv-detail-facts">
          {profile.email && (
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </dd>
            </div>
          )}
          {profile.phone && (
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${profile.phone}`}>{profile.phone}</a>
              </dd>
            </div>
          )}
          {profile.careerLevel && (
            <div>
              <dt>Career level</dt>
              <dd>{profile.careerLevel}</dd>
            </div>
          )}
          {profile.availabilityStatus && (
            <div>
              <dt>Availability</dt>
              <dd>{profile.availabilityStatus.replaceAll('_', ' ')}</dd>
            </div>
          )}
        </dl>
      </section>

      {profile.summary && (
        <section className="card">
          <h2>Summary</h2>
          <p>{profile.summary}</p>
        </section>
      )}

      <section className="card">
        <h2>Resume</h2>
        {resume ? (
          <div className="cv-resume-row">
            <div>
              <strong>{resume.title}</strong>
              <p className="muted">{resume.originalFilename}</p>
            </div>
            <div className="cv-resume-actions">
              <button type="button" className="btn btn-sm" onClick={() => void openResume()}>
                Open
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => void downloadResume()}>
                Download
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">This candidate has not uploaded a resume file.</p>
        )}
      </section>

      {profile.experiences.length > 0 && (
        <section className="card">
          <h2>Experience</h2>
          <ul className="cv-timeline">
            {profile.experiences.map((item) => (
              <li key={item.id}>
                <strong>{item.jobTitle}</strong>
                <p>
                  {item.companyName}
                  {item.workingCity ? ` · ${item.workingCity}` : ''}
                </p>
                <p className="muted">{formatRange(item.startDate, item.endDate, item.isCurrent)}</p>
                {item.description && <p>{item.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.educations.length > 0 && (
        <section className="card">
          <h2>Education</h2>
          <ul className="cv-timeline">
            {profile.educations.map((item) => (
              <li key={item.id}>
                <strong>{item.qualification || item.fieldOfStudy || item.institution}</strong>
                <p>
                  {item.institution}
                  {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ''}
                </p>
                <p className="muted">{formatRange(item.startDate, item.endDate, item.isCurrent)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="card">
          <h2>Skills</h2>
          <div className="badges">
            {profile.skills.map((link) => (
              <span key={`${link.candidateId}-${link.skillId}`} className="badge">
                {link.skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {profile.languages.length > 0 && (
        <section className="card">
          <h2>Languages</h2>
          <p>
            {profile.languages
              .map((lang) => (lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name))
              .join(', ')}
          </p>
        </section>
      )}

      {profile.certifications.length > 0 && (
        <section className="card">
          <h2>Certifications</h2>
          <ul className="cv-timeline">
            {profile.certifications.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                {item.issuer && <p>{item.issuer}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
