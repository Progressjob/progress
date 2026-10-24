import React, { useState } from 'react';

export interface AdminCredentialsModalProps {
  email: string;
  temporaryPassword: string;
  onClose: () => void;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  email,
  temporaryPassword,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const text = `Email: ${email}\nPassword: ${temporaryPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card stack"
        style={{ maxWidth: '480px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0 }}>Employer login credentials</h2>
        <p className="muted" style={{ margin: 0 }}>
          Share these once with the company. If the email already existed, the password was not
          changed—use their existing password or reset separately.
        </p>
        <div className="form-input-group">
          <label>Email</label>
          <input readOnly value={email} />
        </div>
        <div className="form-input-group">
          <label>Temporary password</label>
          <input readOnly value={temporaryPassword} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-auth-submit" style={{ width: 'auto' }} onClick={copyAll}>
            {copied ? 'Copied' : 'Copy credentials'}
          </button>
          <button type="button" className="btn-clear-filters" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
