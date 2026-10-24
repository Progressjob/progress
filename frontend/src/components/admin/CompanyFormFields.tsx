import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CompanyPayload } from '../../api/admin';
import { filesApi, publicFileUrl } from '../../api/files';
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
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const industriesQuery = useQuery({
    queryKey: ['taxonomy', 'industries'],
    queryFn: () => taxonomyApi.industries(),
  });

  const set = (patch: Partial<CompanyPayload>) => onChange({ ...value, ...patch });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const uploaded = await filesApi.uploadLogo(file);
      set({ logoFileId: uploaded.id });
    } catch (err) {
      setLogoError((err as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="contact-form-fields">
      <div className="form-input-group">
        <label htmlFor={`${idPrefix}-logo`}>Company logo (optional)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {value.logoFileId ? (
            <img
              src={publicFileUrl(value.logoFileId)}
              alt="Company logo preview"
              style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '0.75rem',
              }}
            >
              No logo
            </div>
          )}
          <input
            id={`${idPrefix}-logo`}
            type="file"
            accept="image/png,image/jpeg"
            disabled={uploadingLogo}
            onChange={handleLogoChange}
          />
          {uploadingLogo && <span className="muted">Uploading…</span>}
        </div>
        {logoError && <p className="muted" style={{ color: '#b91c1c', margin: '0.35rem 0 0' }}>{logoError}</p>}
      </div>

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
          <label htmlFor={`${idPrefix}-web`}>Website (optional)</label>
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
          <label htmlFor={`${idPrefix}-contact`}>Contact person (HR manager)</label>
          <input
            id={`${idPrefix}-contact`}
            value={value.contactPerson ?? ''}
            onChange={(e) => set({ contactPerson: e.target.value || undefined })}
            placeholder="For admin verification only"
          />
        </div>
        <div className="form-input-group">
          <label htmlFor={`${idPrefix}-licence`}>Company licence registration number</label>
          <input
            id={`${idPrefix}-licence`}
            value={value.licenceNumber ?? ''}
            onChange={(e) => set({ licenceNumber: e.target.value || undefined })}
            placeholder="For verification"
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
          <label htmlFor={`${idPrefix}-founded`}>Founded year (optional)</label>
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
        <label htmlFor={`${idPrefix}-address`}>Office address</label>
        <input
          id={`${idPrefix}-address`}
          value={value.address ?? ''}
          onChange={(e) => set({ address: e.target.value || undefined })}
        />
      </div>
    </div>
  );
};
