import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CreateAdminJobPayload } from '../../api/admin';
import { taxonomyApi } from '../../api/taxonomy';
import type { ApplicationMethod, EmploymentType, WorkplaceType } from '../../types/api';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
};

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

  const set = (patch: Partial<CreateAdminJobPayload>) => onChange({ ...value, ...patch });

  return (
    <div className="contact-form-fields">
      {!hideCompanySelect && companySelect}

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-title">Job title *</label>
          <input
            id="adm-title"
            required
            value={value.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-ref">Reference code</label>
          <input
            id="adm-ref"
            value={value.referenceCode ?? ''}
            onChange={(e) => set({ referenceCode: e.target.value || undefined })}
            placeholder="e.g. DEV-002"
          />
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-cat">Category *</label>
          <select
            id="adm-cat"
            required
            value={value.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            style={selectStyle}
          >
            <option value="">— Select category —</option>
            {(categoriesQuery.data ?? []).map((c) => (
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

      <div className="form-input-group">
        <label htmlFor="adm-summary">Short summary</label>
        <input
          id="adm-summary"
          value={value.summary ?? ''}
          onChange={(e) => set({ summary: e.target.value || undefined })}
        />
      </div>

      <div className="form-input-group">
        <label htmlFor="adm-desc">Full description *</label>
        <textarea
          id="adm-desc"
          rows={4}
          required
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      <div className="form-input-group">
        <label htmlFor="adm-resp">Responsibilities</label>
        <textarea
          id="adm-resp"
          rows={3}
          value={value.responsibilities ?? ''}
          onChange={(e) => set({ responsibilities: e.target.value || undefined })}
        />
      </div>

      <div className="form-input-group">
        <label htmlFor="adm-req">Requirements</label>
        <textarea
          id="adm-req"
          rows={3}
          value={value.requirements ?? ''}
          onChange={(e) => set({ requirements: e.target.value || undefined })}
        />
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-edu">Education requirement</label>
          <input
            id="adm-edu"
            value={value.educationRequirement ?? ''}
            onChange={(e) => set({ educationRequirement: e.target.value || undefined })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-career">Career level</label>
          <input
            id="adm-career"
            value={value.careerLevel ?? ''}
            onChange={(e) => set({ careerLevel: e.target.value || undefined })}
            placeholder="e.g. Mid-level"
          />
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-exp-min">Min experience (years)</label>
          <input
            id="adm-exp-min"
            type="number"
            min={0}
            value={value.experienceMinYears ?? ''}
            onChange={(e) =>
              set({
                experienceMinYears: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="form-input-group">
          <label htmlFor="adm-exp-max">Max experience (years)</label>
          <input
            id="adm-exp-max"
            type="number"
            min={0}
            value={value.experienceMaxYears ?? ''}
            onChange={(e) =>
              set({
                experienceMaxYears: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
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

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-sal-min">Salary min</label>
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
          <label htmlFor="adm-sal-max">Salary max</label>
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
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-currency">Salary currency</label>
          <input
            id="adm-currency"
            value={value.salaryCurrency ?? 'ETB'}
            onChange={(e) => set({ salaryCurrency: e.target.value || undefined })}
          />
        </div>
        <div className="form-input-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={Boolean(value.salaryVisibility)}
              onChange={(e) => set({ salaryVisibility: e.target.checked })}
            />
            Show salary on public listing
          </label>
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor="adm-method">Application method</label>
          <select
            id="adm-method"
            value={value.applicationMethod}
            onChange={(e) => set({ applicationMethod: e.target.value as ApplicationMethod })}
            style={selectStyle}
          >
            <option value="internal">Internal (platform)</option>
            <option value="external_url">External URL</option>
            <option value="email">Email</option>
          </select>
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

      {value.applicationMethod === 'external_url' && (
        <div className="form-input-group">
          <label htmlFor="adm-app-url">Application URL *</label>
          <input
            id="adm-app-url"
            type="url"
            required
            value={value.applicationUrl ?? ''}
            onChange={(e) => set({ applicationUrl: e.target.value || undefined })}
          />
        </div>
      )}

      {value.applicationMethod === 'email' && (
        <div className="form-input-group">
          <label htmlFor="adm-app-email">Application email *</label>
          <input
            id="adm-app-email"
            type="email"
            required
            value={value.applicationEmail ?? ''}
            onChange={(e) => set({ applicationEmail: e.target.value || undefined })}
          />
        </div>
      )}

      <div className="form-input-group">
        <label htmlFor="adm-app-inst">Application instructions</label>
        <textarea
          id="adm-app-inst"
          rows={2}
          value={value.applicationInstructions ?? ''}
          onChange={(e) => set({ applicationInstructions: e.target.value || undefined })}
        />
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
    </div>
  );
};
