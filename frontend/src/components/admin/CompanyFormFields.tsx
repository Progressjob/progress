import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CompanyPayload } from '../../api/admin';
import { taxonomyApi } from '../../api/taxonomy';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
};

export interface CompanyFormFieldsProps {
  value: CompanyPayload;
  onChange: (next: CompanyPayload) => void;
  idPrefix?: string;
}

export const CompanyFormFields: React.FC<CompanyFormFieldsProps> = ({
  value,
  onChange,
  idPrefix = 'co',
}) => {
  const industriesQuery = useQuery({
    queryKey: ['taxonomy', 'industries'],
    queryFn: () => taxonomyApi.industries(),
  });

  const set = (patch: Partial<CompanyPayload>) => onChange({ ...value, ...patch });

  return (
    <div className="contact-form-fields">
      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-name`}>Company name *</label>
          <input
            id={`${idPrefix}-name`}
            required
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Legal or trading name"
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-industry`}>Industry</label>
          <select
            id={`${idPrefix}-industry`}
            value={value.industryId ?? ''}
            onChange={(e) => set({ industryId: e.target.value || undefined })}
            style={selectStyle}
          >
            <option value="">— Select industry —</option>
            {(industriesQuery.data ?? []).map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-input-group">
        <label htmlFor={`${idPrefix}-desc`}>Description</label>
        <textarea
          id={`${idPrefix}-desc`}
          rows={3}
          value={value.description ?? ''}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="What the company does, size, culture…"
        />
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-web`}>Website</label>
          <input
            id={`${idPrefix}-web`}
            type="url"
            value={value.websiteUrl ?? ''}
            onChange={(e) => set({ websiteUrl: e.target.value || undefined })}
            placeholder="https://"
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-size`}>Company size</label>
          <input
            id={`${idPrefix}-size`}
            value={value.companySize ?? ''}
            onChange={(e) => set({ companySize: e.target.value || undefined })}
            placeholder="e.g. 51–200 employees"
          />
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-email`}>Company email</label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={value.email ?? ''}
            onChange={(e) => set({ email: e.target.value || undefined })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-phone`}>Phone</label>
          <input
            id={`${idPrefix}-phone`}
            value={value.phone ?? ''}
            onChange={(e) => set({ phone: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-country`}>Country</label>
          <input
            id={`${idPrefix}-country`}
            value={value.country ?? 'Ethiopia'}
            onChange={(e) => set({ country: e.target.value })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-region`}>Region</label>
          <input
            id={`${idPrefix}-region`}
            value={value.region ?? ''}
            onChange={(e) => set({ region: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-city`}>City</label>
          <input
            id={`${idPrefix}-city`}
            value={value.city ?? ''}
            onChange={(e) => set({ city: e.target.value || undefined })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-founded`}>Founded year</label>
          <input
            id={`${idPrefix}-founded`}
            type="number"
            min={1800}
            max={2200}
            value={value.foundedYear ?? ''}
            onChange={(e) =>
              set({
                foundedYear: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="form-input-group">
        <label htmlFor={`${idPrefix}-address`}>Address</label>
        <input
          id={`${idPrefix}-address`}
          value={value.address ?? ''}
          onChange={(e) => set({ address: e.target.value || undefined })}
        />
      </div>
    </div>
  );
};
