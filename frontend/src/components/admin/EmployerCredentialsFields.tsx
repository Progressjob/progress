import React from 'react';
import type { CreateEmployerPayload } from '../../api/admin';
import { generateTemporaryPassword } from './adminFormUtils';

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
        Primary login for the company portal (email and password only).
      </p>
      <div className="form-input-group">
        <label htmlFor={`${idPrefix}-email`}>Company login email *</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          required
          value={value.email}
          onChange={(e) => set({ email: e.target.value })}
        />
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
