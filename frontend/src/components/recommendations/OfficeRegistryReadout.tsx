import React from 'react';
import type { OfficeRecommendationRegistry } from '../../types/api';
import { apiDownloadFile } from '../../api/client';
import { PROGRESS_HIRE_EMAIL, PROGRESS_MOBILE_PHONES } from '../../constants/progressContact';
import type { TalentDetail } from '../../types/api';

const OFFICE_LABELS: Record<string, string> = {
  department: 'Department',
  category: 'Category',
  jobGrade: 'Job grade',
  basicSalaryExpectation: 'Basic salary expectation',
  transportAllowance: 'Transport allowance',
  houseAllowance: 'House allowance',
  mobileAllowance: 'Mobile allowance',
  foodCoupon: 'Food coupon',
  maritalStatus: 'Marital status',
  placeOfBirth: 'Place of birth',
  bloodGroup: 'Blood group',
  motherName: "Mother's name",
  emergencyContactName: 'Emergency contact',
  emergencyRelationship: 'Emergency relationship',
  emergencyPhone: 'Emergency phone',
  guarantorName: 'Guarantor',
  guarantorPhone: 'Guarantor phone',
  guarantorNationalId: 'Guarantor national ID FAN number',
  bankAccount: 'Bank account',
  notes: 'Office notes',
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="rec-fact-cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export const OfficeRegistryReadout: React.FC<{
  profile: TalentDetail;
  registry: OfficeRecommendationRegistry;
}> = ({ profile, registry }) => {
  const office = registry.officeRecord ?? {};
  const resumes = registry.resumes.length ? registry.resumes : profile.resume ? [profile.resume] : [];

  return (
    <div className="rec-office-registry stack">
      <p className="muted rec-office-lead">
        Registered at the Progress office. Direct contact details are not shown — reach the candidate through
        Progress after your review.
      </p>
      <dl className="rec-facts-grid">
        <Field label="National ID FAN number" value={registry.nationalId} />
        <Field label="Gender" value={registry.gender} />
        <Field label="Date of birth" value={formatDate(registry.dateOfBirth)} />
        <Field label="Registered" value={formatDate(registry.registeredAt)} />
        <Field label="Consent" value={registry.consentAt ? 'Recorded' : 'Not recorded'} />
        <Field
          label="Expected salary"
          value={
            registry.expectedSalary
              ? `${registry.expectedSalary}${registry.salaryCurrency ? ` ${registry.salaryCurrency}` : ''}`
              : null
          }
        />
        <Field label="Location" value={[profile.city, profile.region, profile.country].filter(Boolean).join(', ')} />
      </dl>

      {profile.summary ? (
        <div className="rec-registry-block">
          <h3>Experience &amp; background</h3>
          <p>{profile.summary}</p>
        </div>
      ) : null}

      {profile.educations.length > 0 && (
        <div className="rec-registry-block">
          <h3>Education</h3>
          <ul className="rec-registry-list">
            {profile.educations.map((item) => (
              <li key={item.id}>
                {item.qualification}
                {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ''}
                {item.institution ? ` · ${item.institution}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.languages.length > 0 && (
        <div className="rec-registry-block">
          <h3>Languages</h3>
          <p>{profile.languages.map((item) => item.name).join(', ')}</p>
        </div>
      )}

      {Object.values(office).some(Boolean) && (
        <div className="rec-registry-block">
          <h3>Office intake record</h3>
          <dl className="rec-facts-grid">
            {Object.entries(office)
              .filter(([, value]) => value != null && String(value).trim() !== '')
              .map(([key, value]) => (
                <Field key={key} label={OFFICE_LABELS[key] ?? key} value={value} />
              ))}
          </dl>
        </div>
      )}

      <div className="rec-registry-block">
        <h3>CV documents</h3>
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
          <p className="muted">No CV uploaded with this office registration.</p>
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