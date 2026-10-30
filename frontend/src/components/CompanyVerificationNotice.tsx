import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Company } from '../types/api';
import { employerApi } from '../api/employer';
import { BusinessLicenceUpload } from './BusinessLicenceUpload';

export function CompanyVerificationNotice({ company }: { company: Company }) {
  const client = useQueryClient();
  const [fileId, setFileId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (company.verificationStatus === 'verified') return null;
  return <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
    <h2>{company.verificationStatus === 'rejected' ? 'Business licence rejected' : 'Company verification pending'}</h2>
    <p>You can post jobs after an administrator approves your business licence.
      {company.verificationStatus === 'rejected' ? ' Upload a corrected licence to request another review.' : ' We will show your approval status here.'}</p>
    {company.documents?.length ? <p>Business licence submitted for review.</p> : <p>A business licence is required to complete verification.</p>}
    <p>{company.documents?.[0]?.reviewNote}</p>
    <BusinessLicenceUpload value={fileId} onChange={setFileId} required={!company.documents?.length} />
    <button type="button" className="btn-nav-register" disabled={!fileId || busy} onClick={async () => {
      setBusy(true); setError('');
      try {
        await employerApi.updateCompany(company.id, { businessLicenceFileId: fileId });
        setFileId('');
        await client.invalidateQueries({ queryKey: ['company'] });
      } catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>{busy ? 'Submitting…' : 'Submit licence for review'}</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
