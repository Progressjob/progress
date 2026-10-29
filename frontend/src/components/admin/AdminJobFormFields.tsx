import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CreateAdminJobPayload } from '../../api/admin';
import { taxonomyApi } from '../../api/taxonomy';
import { educationRequirementOptions } from '../../constants/educationLevels';
import { PROGRESS_HIRE_EMAIL } from '../../constants/progressContact';
import { hireBoxDisplay, parseHireBox } from '../../utils/hireContact';
import type { Category, EmploymentType, WorkplaceType } from '../../types/api';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
};

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
    >
      {expanded ? 'Short view' : 'Full view'}
    </button>
  );
}

export interface AdminJobFormFieldsProps {
  value: CreateAdminJobPayload;
  onChange: (next: CreateAdminJobPayload) => void;
  hideCompanySelect?: boolean;
  companySelect?: React.ReactNode;
}

export const AdminJobFormFields: React.FC<AdminJobFormFieldsProps> = ({
  value,
  onChange,
  hideCompanySelect,
  companySelect,
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
    <div className="contact-form-fields">
      {!hideCompanySelect && companySelect}

      <div className="form-input-group">
        <label htmlFor="adm-title">Job title *</label>
        <input
          id="adm-title"
          required
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-cat">Responsibilities *</label>
          <select
            id="adm-cat"
            required
            value={value.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            style={selectStyle}
          >
            <option value="">— Select responsibility area —</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-loc">Location</label>
          <select
            id="adm-loc"
            value={value.locationId ?? ''}
            onChange={(e) => set({ locationId: e.target.value || undefined })}
            style={selectStyle}
          >
            <option value="">— Optional —</option>
            {(locationsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.region ?? 'Ethiopia'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {value.categoryId && (
        <div className="form-input-group">
          <div className="form-field-heading">
            <label htmlFor="adm-resp-desc">
              Responsibility description *
              {selectedCategory ? ` (${selectedCategory.name})` : ''}
            </label>
            <FieldViewToggle
              expanded={respFullView}
              onToggle={() => setRespFullView((open) => !open)}
            />
          </div>
          {selectedCategory?.description && (
            <p className="muted" style={{ margin: '0 0 0.35rem', fontSize: '0.85rem' }}>
              {selectedCategory.description}
            </p>
          )}
          <textarea
            id="adm-resp-desc"
            className={respFullView ? 'textarea-full-view' : 'textarea-short-view'}
            rows={respFullView ? 16 : 3}
            required
            value={value.responsibilities ?? ''}
            onChange={(e) => set({ responsibilities: e.target.value })}
            placeholder="Describe what the hire will do in this role (shown to candidates)."
          />
        </div>
      )}

      <div className="form-input-group">
        <div className="form-field-heading">
          <label htmlFor="adm-req">Required Qualifications and Skills</label>
          <FieldViewToggle
            expanded={reqFullView}
            onToggle={() => setReqFullView((open) => !open)}
          />
        </div>
        <textarea
          id="adm-req"
          className={reqFullView ? 'textarea-full-view' : 'textarea-short-view'}
          rows={reqFullView ? 16 : 3}
          value={value.requirements ?? ''}
          onChange={(e) => set({ requirements: e.target.value || undefined })}
        />
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-edu">Education requirement</label>
          <select
            id="adm-edu"
            value={value.educationRequirement ?? ''}
            onChange={(e) => set({ educationRequirement: e.target.value || undefined })}
            style={selectStyle}
          >
            <option value="">— Optional —</option>
            {educationRequirementOptions(value.educationRequirement).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-exp">Required Work Experience (years)</label>
          <input
            id="adm-exp"
            type="number"
            min={0}
            step={0.5}
            value={value.experienceMinYears ?? ''}
            onChange={(e) =>
              set({
                experienceMinYears: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="form-input-group">
        <label htmlFor="adm-vac">Open positions *</label>
        <input
          id="adm-vac"
          type="number"
          min={1}
          required
          value={value.vacanciesCount}
          onChange={(e) => set({ vacanciesCount: Number(e.target.value) || 1 })}
          style={{ maxWidth: '120px' }}
        />
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-emp">Employment type</label>
          <select
            id="adm-emp"
            value={value.employmentType}
            onChange={(e) => set({ employmentType: e.target.value as EmploymentType })}
            style={selectStyle}
          >
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-work">Workplace</label>
          <select
            id="adm-work"
            value={value.workplaceType}
            onChange={(e) => set({ workplaceType: e.target.value as WorkplaceType })}
            style={selectStyle}
          >
            <option value="on_site">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>
      </div>

      <div className="form-input-group">
        <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Salary</span>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="radio"
              name="adm-salary-mode"
              checked={salaryMode === 'negotiable'}
              onChange={() => setSalaryMode('negotiable')}
            />
            Negotiable
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="radio"
              name="adm-salary-mode"
              checked={salaryMode === 'range'}
              onChange={() => setSalaryMode('range')}
            />
            Specify range
          </label>
        </div>
        {salaryMode === 'range' && (
          <div className="form-row-two">
            <div className="form-input-group">
              <label htmlFor="adm-sal-min">Minimum</label>
              <input
                id="adm-sal-min"
                type="number"
                min={0}
                value={value.salaryMin ?? ''}
                onChange={(e) =>
                  set({ salaryMin: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="form-input-group">
              <label htmlFor="adm-sal-max">Maximum</label>
              <input
                id="adm-sal-max"
                type="number"
                min={0}
                value={value.salaryMax ?? ''}
                onChange={(e) =>
                  set({ salaryMax: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="form-input-group">
              <label htmlFor="adm-currency">Currency</label>
              <input
                id="adm-currency"
                value={value.salaryCurrency ?? 'ETB'}
                onChange={(e) => set({ salaryCurrency: e.target.value || undefined })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-input-group">
        <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          How to hire *
        </span>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="radio"
              name="adm-hire-method"
              required
              checked={value.applicationMethod === 'email'}
              onChange={() => set({ applicationMethod: 'email' })}
            />
            Contact the company
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="radio"
              name="adm-hire-method"
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
            Hire through Progress (admin)
          </label>
        </div>
        {value.applicationMethod === 'email' && (
          <div className="form-input-group">
            <label htmlFor="adm-hire-contact">How should candidates contact you? *</label>
            <textarea
              id="adm-hire-contact"
              rows={4}
              style={{ whiteSpace: 'pre-wrap' }}
              required
              value={hireBoxDisplay(value.applicationEmail, value.applicationInstructions)}
              onChange={(e) => set(parseHireBox(e.target.value))}
              placeholder="Phone, Telegram, WhatsApp, email, office visit — any way to reach you"
            />
            <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
              Email is optional. Write whatever candidates should use to get in touch.
            </p>
          </div>
        )}
        {value.applicationMethod === 'admin' && (
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Candidates will be told to contact Progress at <strong>{PROGRESS_HIRE_EMAIL}</strong>.
          </p>
        )}
      </div>

      <div className="form-input-group">
        <label htmlFor="adm-deadline">Application deadline *</label>
        <input
          id="adm-deadline"
          type="date"
          required
          value={value.applicationDeadline}
          onChange={(e) => set({ applicationDeadline: e.target.value })}
        />
      </div>
    </div>
  );
};
