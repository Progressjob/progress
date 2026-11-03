import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessLicenceUpload } from '../BusinessLicenceUpload';
import type { CompanyPayload } from '../../api/admin';
import { filesApi, publicFileUrl } from '../../api/files';
import { taxonomyApi } from '../../api/taxonomy';
import { COMPANY_SIZE_OPTIONS } from '../../constants/companySize';

export interface CompanyFormFieldsProps {
  value: CompanyPayload;
  onChange: (next: CompanyPayload) => void;
  licenceRequired?: boolean;
  idPrefix?: string;
  audience?: 'admin' | 'employer';
}

export const CompanyFormFields: React.FC<CompanyFormFieldsProps> = ({
  value,
  onChange,
  idPrefix = 'co',
  audience = 'admin',
  licenceRequired = true,
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
    <div className="profile-form-sections">
      {/* 1. Branding & Verification Documents */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Branding & Verification Documents</h2>
            <p className="profile-section-desc">
              Your official brandmark and business registration license for platform verification.
            </p>
          </div>
        </div>

        <div className="profile-upload-grid">
          {/* Company Logo Uploader Card */}
          <div className="profile-upload-card">
            <div className="profile-upload-card-content">
              <div className="profile-logo-frame">
                {value.logoFileId ? (
                  <img
                    src={publicFileUrl(value.logoFileId)}
                    alt="Company logo preview"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      gap: '2px',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>No logo</span>
                  </div>
                )}
              </div>
              <div className="profile-upload-meta">
                <div className="profile-upload-label">
                  <span>Company logo</span>
                  <span className="profile-field-req" title="Required">*</span>
                </div>
                <p className="profile-upload-hint">
                  PNG or JPEG · Max 5 MB. Displayed on public vacancies and search results.
                </p>
                {value.logoFileId && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className="profile-pill-success">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Logo uploaded
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                id={`${idPrefix}-logo`}
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploadingLogo}
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <label
                htmlFor={`${idPrefix}-logo`}
                className={`profile-upload-btn ${uploadingLogo ? 'is-disabled' : ''}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {uploadingLogo ? 'Uploading logo…' : value.logoFileId ? 'Change logo' : 'Upload company logo'}
              </label>
              {uploadingLogo && <span className="muted" style={{ fontSize: '0.82rem' }}>Processing…</span>}
            </div>
            {logoError && (
              <p className="muted" role="alert" style={{ color: '#b91c1c', margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                {logoError}
              </p>
            )}
          </div>

          {/* Business Licence Card */}
          <BusinessLicenceUpload
            value={value.businessLicenceFileId}
            onChange={(id) => set({ businessLicenceFileId: id })}
            required={licenceRequired}
          />
        </div>
      </section>

      {/* 2. Company Overview */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="22" />
              <line x1="15" y1="22" x2="15" y2="22" />
              <line x1="9" y1="6" x2="9.01" y2="6" />
              <line x1="15" y1="6" x2="15.01" y2="6" />
              <line x1="9" y1="10" x2="9.01" y2="10" />
              <line x1="15" y1="10" x2="15.01" y2="10" />
              <line x1="9" y1="14" x2="9.01" y2="14" />
              <line x1="15" y1="14" x2="15.01" y2="14" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Company Overview</h2>
            <p className="profile-section-desc">
              Essential identification and industry classification candidates look for.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-name`}>
                Company name <span className="profile-field-req">*</span>
              </label>
              <input
                id={`${idPrefix}-name`}
                required
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Legal or trading name, e.g. Demo Technology PLC"
              />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-industry`}>Industry</label>
              <select
                id={`${idPrefix}-industry`}
                value={value.industryId ?? ''}
                onChange={(e) => set({ industryId: e.target.value || undefined })}
              >
                <option value="">— Select industry category —</option>
                {(industriesQuery.data ?? []).map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-size`}>Company size</label>
              <select
                id={`${idPrefix}-size`}
                value={value.companySize ?? ''}
                onChange={(e) => set({ companySize: e.target.value || undefined })}
              >
                <option value="">— Select headcount range —</option>
                {COMPANY_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-founded`}>
                Founded year <span className="profile-field-opt">(optional)</span>
              </label>
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
                placeholder="e.g. 2018"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. About & Organization Story */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">About & Culture</h2>
            <p className="profile-section-desc">
              Introduce your company's mission, values, work environment, and what makes you unique.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="profile-field-wrap">
            <label htmlFor={`${idPrefix}-desc`}>About the company</label>
            <textarea
              id={`${idPrefix}-desc`}
              rows={4}
              value={value.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Describe your primary services, core specializations, work culture, and why top talent should join your organization..."
            />
          </div>

          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-vision`}>Vision</label>
              <textarea
                id={`${idPrefix}-vision`}
                rows={3}
                value={value.vision ?? ''}
                onChange={(e) => set({ vision: e.target.value })}
                placeholder="Where the company is heading in the future..."
              />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-mission`}>Mission</label>
              <textarea
                id={`${idPrefix}-mission`}
                rows={3}
                value={value.mission ?? ''}
                onChange={(e) => set({ mission: e.target.value })}
                placeholder="What your company strives to accomplish every day..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Contact & Online Presence */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Contact & Online Presence</h2>
            <p className="profile-section-desc">
              Direct communication channels for candidate outreach and general inquiries.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-email`}>Company email</label>
              <input
                id={`${idPrefix}-email`}
                type="email"
                value={value.email ?? ''}
                onChange={(e) => set({ email: e.target.value || undefined })}
                placeholder="e.g. hiring@company.et"
              />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-phone`}>Phone</label>
              <input
                id={`${idPrefix}-phone`}
                value={value.phone ?? ''}
                onChange={(e) => set({ phone: e.target.value || undefined })}
                placeholder="e.g. +251 91 100 0000"
              />
            </div>
          </div>

          <div className="profile-field-wrap">
            <label htmlFor={`${idPrefix}-web`}>
              Website <span className="profile-field-opt">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-web`}
              type="url"
              value={value.websiteUrl ?? ''}
              onChange={(e) => set({ websiteUrl: e.target.value || undefined })}
              placeholder="https://www.yourcompany.com"
            />
          </div>
        </div>
      </section>

      {/* 5. Headquarters & Office Location */}
      <section className="profile-form-section">
        <div className="profile-section-header">
          <div className="profile-section-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="profile-section-title-wrap">
            <h2 className="profile-section-title">Headquarters & Location</h2>
            <p className="profile-section-desc">
              Physical headquarters where operations and workplace teams are stationed.
            </p>
          </div>
        </div>

        <div className="profile-form-grid">
          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-country`}>Country</label>
              <input
                id={`${idPrefix}-country`}
                value={value.country ?? 'Ethiopia'}
                onChange={(e) => set({ country: e.target.value })}
                placeholder="Ethiopia"
              />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-region`}>Region / State</label>
              <input
                id={`${idPrefix}-region`}
                value={value.region ?? ''}
                onChange={(e) => set({ region: e.target.value || undefined })}
                placeholder="e.g. Addis Ababa or Oromia"
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-city`}>City</label>
              <input
                id={`${idPrefix}-city`}
                value={value.city ?? ''}
                onChange={(e) => set({ city: e.target.value || undefined })}
                placeholder="e.g. Addis Ababa, Nazret, Hawassa"
              />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor={`${idPrefix}-founded-office`}>Office address</label>
              <input
                id={`${idPrefix}-address`}
                value={value.address ?? ''}
                onChange={(e) => set({ address: e.target.value || undefined })}
                placeholder="e.g. Bole Sub-city, Woreda 03, Building 4B"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Administrative Details (Admin Audience only) */}
      {audience === 'admin' && (
        <section className="profile-form-section">
          <div className="profile-section-header">
            <div className="profile-section-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            </div>
            <div className="profile-section-title-wrap">
              <h2 className="profile-section-title">Administrative Verification</h2>
              <p className="profile-section-desc">
                Confidential internal records for compliance and official liaison.
              </p>
            </div>
          </div>

          <div className="profile-form-grid">
            <div className="form-row-two">
              <div className="profile-field-wrap">
                <label htmlFor={`${idPrefix}-contact`}>Contact person (HR manager)</label>
                <input
                  id={`${idPrefix}-contact`}
                  value={value.contactPerson ?? ''}
                  onChange={(e) => set({ contactPerson: e.target.value || undefined })}
                  placeholder="Primary contact name for verification"
                />
              </div>
              <div className="profile-field-wrap">
                <label htmlFor={`${idPrefix}-licence`}>Company licence registration number</label>
                <input
                  id={`${idPrefix}-licence`}
                  value={value.licenceNumber ?? ''}
                  onChange={(e) => set({ licenceNumber: e.target.value || undefined })}
                  placeholder="Official trade / commercial licence number"
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
