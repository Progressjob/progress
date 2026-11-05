import React, { useId, useState } from 'react';
import { filesApi } from '../api/files';

export interface BusinessLicenceUploadProps {
  value?: string;
  onChange: (id: string) => void;
  required?: boolean;
}

export const BusinessLicenceUpload: React.FC<BusinessLicenceUploadProps> = ({
  value,
  onChange,
  required = true,
}) => {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > 5_242_880) {
      setError('Choose a file smaller than 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const uploaded = await filesApi.uploadBusinessLicence(file);
      onChange(uploaded.id);
      setFilename(file.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-upload-card">
      <div className="profile-upload-card-content">
        <div className="profile-doc-icon-frame" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="profile-upload-meta">
          <div className="profile-upload-label">
            <span>Business licence</span>
            {required ? (
              <span className="profile-field-req" title="Required">*</span>
            ) : (
              <span className="profile-field-opt">(optional update)</span>
            )}
          </div>
          <p className="profile-upload-hint">
            <span className="employer-hint-full">PDF, PNG or JPEG · Max 5 MB. Kept strictly private for admin verification.</span>
            <span className="employer-hint-short">PDF/PNG/JPEG · max 5 MB</span>
          </p>

          {value && (
            <div className="profile-upload-status">
              <span className="profile-pill-success" role="status">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {filename ? filename : 'Document on file'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-upload-actions">
        <input
          id={id}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          required={required && !value}
          disabled={busy}
          onChange={handleFileChange}
          hidden
        />
        <label
          htmlFor={id}
          className={`profile-upload-btn ${busy ? 'is-disabled' : ''}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="employer-btn-full">
            {busy ? 'Uploading licence…' : value ? 'Replace document' : 'Upload licence file'}
          </span>
          <span className="employer-btn-short">
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload licence'}
          </span>
        </label>
        {busy && <span className="muted profile-upload-processing">Processing…</span>}
      </div>

      {error && (
        <p className="profile-upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
