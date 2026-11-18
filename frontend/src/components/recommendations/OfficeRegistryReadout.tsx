import React from 'react';
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
  const salary = registry.expectedSalary
    ? `${registry.expectedSalary}${registry.salaryCurrency ? ` ${registry.salaryCurrency}` : ''}`
    : null;

  return (
    <div className="rec-office-registry stack">
      <p className="muted rec-office-lead">
        Reach this candidate through Progress. Their phone and email are not shown here.
      </p>
      {(location || registry.gender || registry.dateOfBirth || salary) && (
        <dl className="rec-facts-grid">
          <Field label="Location" value={location} />
          <Field label="Gender" value={registry.gender} />
          <Field label="Date of birth" value={birthLabel(registry.dateOfBirth)} />
          <Field label="Expected salary" value={salary} />
        </dl>
      )}

      {profile.summary ? (
        <div className="rec-registry-block">
          <h3>Experience</h3>
          <p>{profile.summary}</p>
        </div>
      ) : null}

      {profile.educations.length > 0 && (
        <div className="rec-registry-block">
          <h3>Education</h3>
          <ul className="rec-registry-list">
            {profile.educations.map((item) => {
              const line = [item.qualification, item.fieldOfStudy, schoolName(item.institution)].filter(Boolean).join(' · ');
              return <li key={item.id}>{line}</li>;
            })}
          </ul>
        </div>
      )}

      {profile.languages.length > 0 && (
        <div className="rec-registry-block">
          <h3>Languages</h3>
          <p>{profile.languages.map((item) => item.name).join(', ')}</p>
        </div>
      )}

      <div className="rec-registry-block">
        <h3>CV</h3>
        {resumes.length ? (
          <ul className="rec-registry-list">
            {resumes.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  className="rec-btn rec-btn-soft"
                  onClick={() => void apiDownloadFile(file.fileId, file.originalFilename || 'cv.pdf')}
                >
                  Download {file.originalFilename || file.title || 'CV'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No CV uploaded yet.</p>
        )}
      </div>

      <div className="rec-registry-block rec-office-contact">
        <h3>Contact via Progress</h3>
        <p>
          {PROGRESS_MOBILE_PHONES.join(' · ')} · {PROGRESS_HIRE_EMAIL}
        </p>
      </div>
    </div>
  );
};
