import { useId, useState } from 'react';
import { filesApi } from '../api/files';

export function BusinessLicenceUpload({ value, onChange, required = true }: {
  value?: string; onChange: (id: string) => void; required?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  return <div className="form-input-group">
    <label htmlFor={id}>Business licence {required ? '*' : '(replace document)'}</label>
    <p className="muted">PDF, PNG or JPEG · Maximum 5 MB. Private: only your company and platform reviewers can access it. Admin approval is required before posting jobs.</p>
    <input id={id} type="file" accept="application/pdf,image/png,image/jpeg" required={required && !value}
      disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError('');
        if (file.size > 5_242_880) { setError('Choose a file smaller than 5 MB.'); return; }
        setBusy(true);
        try {
          const uploaded = await filesApi.uploadBusinessLicence(file);
          onChange(uploaded.id);
          setFilename(file.name);
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
      }} />
    <span role="status">{busy ? 'Uploading licence…' : value ? `Uploaded: ${filename || 'business licence'}` : ''}</span>
    {error && <p role="alert">{error}</p>}
  </div>;
}
