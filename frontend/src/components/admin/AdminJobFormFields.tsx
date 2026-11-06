import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CreateAdminJobPayload } from '../../api/admin';
import { taxonomyApi } from '../../api/taxonomy';
import { educationRequirementOptions } from '../../constants/educationLevels';
import { PROGRESS_HIRE_EMAIL } from '../../constants/progressContact';
import { hireBoxDisplay, parseHireBox } from '../../utils/hireContact';
import type { Category, EmploymentType, WorkplaceType } from '../../types/api';

function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = [];
  for (const c of categories) {
    out.push(c);
    if (c.children?.length) {
      out.push(...flattenCategories(c.children));
    }
  }
  return out;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function FieldViewToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-field-view"
      onClick={onToggle}
      aria-pressed={expanded}
      style={{
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        color: '#475569',
        borderRadius: '9999px',
        padding: '0.2rem 0.65rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {expanded ? 'Short view ▲' : 'Full view ▼'}
    </button>
  );
}

export interface AdminJobFormFieldsProps {
  value: CreateAdminJobPayload;
  onChange: (next: CreateAdminJobPayload) => void;
  hideCompanySelect?: boolean;
  companySelect?: React.ReactNode;
  minDeadline?: string;
  hideDeadline?: boolean;
  idPrefix?: string;
}

export const AdminJobFormFields: React.FC<AdminJobFormFieldsProps> = ({
  value,
  onChange,
  hideCompanySelect,
  companySelect,
  minDeadline,
  hideDeadline,
  idPrefix = 'adm',
}) => {
  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const locationsQuery = useQuery({
    queryKey: ['taxonomy', 'locations'],
    queryFn: () => taxonomyApi.locations(),
  });

  const categoryOptions = useMemo(
    () => flattenCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const selectedCategory = categoryOptions.find((c) => c.id === value.categoryId);
  const [respFullView, setRespFullView] = useState(false);
  const [reqFullView, setReqFullView] = useState(false);

  const salaryMode: 'negotiable' | 'range' =
    value.salaryVisibility || value.salaryMin != null || value.salaryMax != null
      ? 'range'
      : 'negotiable';

  const set = (patch: Partial<CreateAdminJobPayload>) => onChange({ ...value, ...patch });

  const setSalaryMode = (mode: 'negotiable' | 'range') => {
    if (mode === 'negotiable') {
      onChange({
        ...value,
        salaryMin: undefined,
        salaryMax: undefined,
        salaryVisibility: false,
      });
    } else {
      onChange({
        ...value,
        salaryVisibility: true,
        salaryCurrency: value.salaryCurrency ?? 'ETB',
      });
    }
  };

  return (
    <div className="profile-form-sections">
      {/* 1. Role Overview & Placement */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Role Overview</h2>
            <p className="profile-section-desc">
              Specify the position title, professional category, location, and workplace arrangement.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          {!hideCompanySelect && companySelect && (
            <div className="profile-field-wrap">{companySelect}</div>
          )}

          <div className="profile-field-wrap">
            <label htmlFor={`${idPrefix}-title`}>
              Job Title <span className="profile-field-req">*</span>
            </label>
            <input
              id={`${idPrefix}-title`}
              type="text"
              required
              placeholder="e.g. Senior Software Engineer, Operations Manager, Accountant"
              value={value.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>

          <div className="job-form-grid-2">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-cat`}>
                Career Category <span className="profile-field-req">*</span>
              </label>
              <select
                id={`${idPrefix}-cat`}
                required
                value={value.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
              >
                <option value="">— Select Career Category —</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-loc`}>
                Job Location <span className="profile-field-opt">(Optional)</span>
              </label>
              <select
                id={`${idPrefix}-loc`}
                value={value.locationId ?? ''}
                onChange={(e) => set({ locationId: e.target.value || undefined })}
              >
                <option value="">— All Ethiopia / Select City or Region —</option>
                {(locationsQuery.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.region ?? 'Ethiopia'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="job-form-grid-2">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-work`}>
                Workplace Arrangement <span className="profile-field-req">*</span>
              </label>
              <select
                id={`${idPrefix}-work`}
                value={value.workplaceType}
                onChange={(e) => set({ workplaceType: e.target.value as WorkplaceType })}
              >
                <option value="on_site">On-site (Work at office/facility)</option>
                <option value="hybrid">Hybrid (Split between office & home)</option>
                <option value="remote">Fully Remote (Work from anywhere)</option>
              </select>
            </div>

            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-emp`}>
                Employment Type <span className="profile-field-req">*</span>
              </label>
              <select
                id={`${idPrefix}-emp`}
                value={value.employmentType}
                onChange={(e) => set({ employmentType: e.target.value as EmploymentType })}
              >
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Responsibilities & Requirements */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Duties & Qualifications</h2>
            <p className="profile-section-desc">
              Detail day-to-day deliverables, credentials, required experience, and vacancy headcount.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="profile-field-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <label htmlFor={`${idPrefix}-resp-desc`}>
                Role Responsibilities & Key Duties <span className="profile-field-req">*</span>
                {selectedCategory ? ` (${selectedCategory.name})` : ''}
              </label>
              <FieldViewToggle
                expanded={respFullView}
                onToggle={() => setRespFullView((open) => !open)}
              />
            </div>
            {selectedCategory?.description && (
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: '#64748b' }}>
                Tip: {selectedCategory.description}
              </p>
            )}
            <textarea
              id={`${idPrefix}-resp-desc`}
              rows={respFullView ? 14 : 5}
              required
              value={value.responsibilities ?? ''}
              onChange={(e) => set({ responsibilities: e.target.value })}
              placeholder="Outline the main responsibilities, day-to-day tasks, deliverables, and team expectations for this position..."
            />
          </div>

          <div className="profile-field-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <label htmlFor={`${idPrefix}-req`}>
                Required Qualifications & Skills <span className="profile-field-opt">(Optional)</span>
              </label>
              <FieldViewToggle
                expanded={reqFullView}
                onToggle={() => setReqFullView((open) => !open)}
              />
            </div>
            <textarea
              id={`${idPrefix}-req`}
              rows={reqFullView ? 14 : 5}
              value={value.requirements ?? ''}
              onChange={(e) => set({ requirements: e.target.value || undefined })}
              placeholder="List required degrees, technical proficiencies, tools, certifications, languages, and core skills..."
            />
          </div>

          <div className="job-form-grid-3">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-edu`}>
                Minimum Education <span className="profile-field-opt">(Optional)</span>
              </label>
              <select
                id={`${idPrefix}-edu`}
                value={value.educationRequirement ?? ''}
                onChange={(e) => set({ educationRequirement: e.target.value || undefined })}
              >
                <option value="">— Any Education Level —</option>
                {educationRequirementOptions(value.educationRequirement).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-exp`}>
                Work Experience (Years) <span className="profile-field-opt">(Optional)</span>
              </label>
              <input
                id={`${idPrefix}-exp`}
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 2 (or 0 for entry)"
                value={value.experienceMinYears ?? ''}
                onChange={(e) =>
                  set({
                    experienceMinYears: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-vac`}>
                Open Positions <span className="profile-field-req">*</span>
              </label>
              <input
                id={`${idPrefix}-vac`}
                type="number"
                min={1}
                required
                value={value.vacanciesCount}
                onChange={(e) => set({ vacanciesCount: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Compensation */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Compensation</h2>
            <p className="profile-section-desc">
              Indicate whether salary is negotiable or provide a transparent compensation range.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="job-form-radio-grid">
            <label
              className={`job-form-radio-card ${salaryMode === 'negotiable' ? 'is-active' : ''}`}
            >
              <input
                type="radio"
                name={`${idPrefix}-salary-mode`}
                checked={salaryMode === 'negotiable'}
                onChange={() => setSalaryMode('negotiable')}
              />
              <div className="job-form-radio-content">
                <span className="job-form-radio-title">Negotiable / Competitive</span>
                <span className="job-form-radio-desc">
                  Salary will be discussed during interview based on qualifications.
                </span>
              </div>
            </label>

            <label className={`job-form-radio-card ${salaryMode === 'range' ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={`${idPrefix}-salary-mode`}
                checked={salaryMode === 'range'}
                onChange={() => setSalaryMode('range')}
              />
              <div className="job-form-radio-content">
                <span className="job-form-radio-title">Specify Salary Range</span>
                <span className="job-form-radio-desc">
                  Display minimum and maximum monthly pay range publicly.
                </span>
              </div>
            </label>
          </div>

          {salaryMode === 'range' && (
            <div className="job-form-grid-3">
              <div className="profile-field-wrap">
                <label htmlFor={`${idPrefix}-sal-min`}>Minimum Pay</label>
                <input
                  id={`${idPrefix}-sal-min`}
                  type="number"
                  min={0}
                  placeholder="e.g. 15000"
                  value={value.salaryMin ?? ''}
                  onChange={(e) =>
                    set({ salaryMin: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>

              <div className="profile-field-wrap">
                <label htmlFor={`${idPrefix}-sal-max`}>Maximum Pay</label>
                <input
                  id={`${idPrefix}-sal-max`}
                  type="number"
                  min={0}
                  placeholder="e.g. 25000"
                  value={value.salaryMax ?? ''}
                  onChange={(e) =>
                    set({ salaryMax: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>

              <div className="profile-field-wrap">
                <label htmlFor={`${idPrefix}-currency`}>Currency</label>
                <input
                  id={`${idPrefix}-currency`}
                  placeholder="ETB"
                  value={value.salaryCurrency ?? 'ETB'}
                  onChange={(e) => set({ salaryCurrency: e.target.value || undefined })}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Application Channel & Deadline */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Additional Contact & Deadline</h2>
            <p className="profile-section-desc">
              Candidates always apply through Progress. Optionally show extra contact details, and set the closing date.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="job-form-info-callout" style={{ gridColumn: '1 / -1' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: '#0b57d0' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              In-system applications are always on. Use the options below only for optional How to apply contact shown on the job page.
            </div>
          </div>

          <div className="profile-field-wrap">
            <label style={{ marginBottom: '0.25rem' }}>
              Optional contact channel <span className="profile-field-req">*</span>
            </label>
            <div className="job-form-radio-grid">
              <label
                className={`job-form-radio-card ${value.applicationMethod === 'email' ? 'is-active' : ''}`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-hire-method`}
                  required
                  checked={value.applicationMethod === 'email'}
                  onChange={() => set({ applicationMethod: 'email' })}
                />
                <div className="job-form-radio-content">
                  <span className="job-form-radio-title">Company Contact</span>
                  <span className="job-form-radio-desc">
                    Also show your phone, Telegram, email, or walk-in details on the job page.
                  </span>
                </div>
              </label>

              <label
                className={`job-form-radio-card ${value.applicationMethod === 'admin' ? 'is-active' : ''}`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-hire-method`}
                  required
                  checked={value.applicationMethod === 'admin'}
                  onChange={() =>
                    set({
                      applicationMethod: 'admin',
                      applicationEmail: undefined,
                      applicationInstructions: undefined,
                    })
                  }
                />
                <div className="job-form-radio-content">
                  <span className="job-form-radio-title">Progress Manpower Contact</span>
                  <span className="job-form-radio-desc">
                    Also show Progress Manpower contact so staff can assist with outreach.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {value.applicationMethod === 'email' && (
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-hire-contact`}>
                Contact Channels & Instructions <span className="profile-field-req">*</span>
              </label>
              <textarea
                id={`${idPrefix}-hire-contact`}
                rows={4}
                style={{ whiteSpace: 'pre-wrap' }}
                required
                value={hireBoxDisplay(value.applicationEmail, value.applicationInstructions)}
                onChange={(e) => set(parseHireBox(e.target.value))}
                placeholder="Phone number, Telegram (@username), email, WhatsApp, or office walk-in address..."
              />
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Shown as extra contact on the job page. Candidates still apply through Progress.
              </p>
            </div>
          )}

          {value.applicationMethod === 'admin' && (
            <div className="job-form-info-callout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: '#0b57d0' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                The job page will also show Progress Manpower contact at{' '}
                <strong>{PROGRESS_HIRE_EMAIL}</strong>. Candidates still submit applications in Progress.
              </div>
            </div>
          )}

          {!hideDeadline && (
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-deadline`}>
                Application Deadline <span className="profile-field-req">*</span>
              </label>
              <input
                id={`${idPrefix}-deadline`}
                type="date"
                required
                min={minDeadline}
                value={value.applicationDeadline}
                onChange={(e) => set({ applicationDeadline: e.target.value })}
              />
              <div className="job-deadline-quick-row">
                <span className="job-deadline-quick-label">Quick pick:</span>
                {[14, 30, 60].map((days) => {
                  const targetIso = addDaysIso(days);
                  const isCurrent = value.applicationDeadline === targetIso;
                  return (
                    <button
                      key={days}
                      type="button"
                      className={`job-deadline-preset-pill ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => set({ applicationDeadline: targetIso })}
                    >
                      +{days} days
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Candidates can submit applications until 11:59 PM on this date.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
