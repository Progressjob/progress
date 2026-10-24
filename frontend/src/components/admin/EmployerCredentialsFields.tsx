import React from 'react';
import type { CreateEmployerPayload } from '../../api/admin';
import type { CompanyMemberRole } from '../../types/api';
import { generateTemporaryPassword } from './adminFormUtils';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
};

export interface EmployerCredentialsFieldsProps {
  value: CreateEmployerPayload;
  onChange: (next: CreateEmployerPayload) => void;
  idPrefix?: string;
}

export const EmployerCredentialsFields: React.FC<EmployerCredentialsFieldsProps> = ({
  value,
  onChange,
  idPrefix = 'emp',
}) => {
  const set = (patch: Partial<CreateEmployerPayload>) => onChange({ ...value, ...patch });

  return (
    <div className="contact-form-fields">
      <p className="muted" style={{ margin: '0 0 0.5rem' }}>
        Primary login for the company portal (owner account).
      </p>
      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-email`}>Employer email *</label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            required
            value={value.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-role`}>Portal role</label>
          <select
            id={`${idPrefix}-role`}
            value={value.memberRole}
            onChange={(e) => set({ memberRole: e.target.value as CompanyMemberRole })}
            style={selectStyle}
          >
            <option value="owner">Owner</option>
            <option value="recruiter">Recruiter</option>
            <option value="hiring_manager">Hiring manager</option>
          </select>
        </div>
      </div>
      <div className="form-row-two">
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-fn`}>First name *</label>
          <input
            id={`${idPrefix}-fn`}
            required
            value={value.firstName}
            onChange={(e) => set({ firstName: e.target.value })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-ln`}>Last name *</label>
          <input
            id={`${idPrefix}-ln`}
            required
            value={value.lastName}
            onChange={(e) => set({ lastName: e.target.value })}
          />
        </div>
      </div>
      <div className="form-input-group">
        <label htmlFor={`${idPrefix}-pw`}>Temporary password *</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id={`${idPrefix}-pw`}
            required
            minLength={8}
            value={value.temporaryPassword}
            onChange={(e) => set({ temporaryPassword: e.target.value })}
            style={{ flex: '1 1 200px' }}
          />
          <button
            type="button"
            className="btn-clear-filters"
            onClick={() => set({ temporaryPassword: generateTemporaryPassword() })}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
