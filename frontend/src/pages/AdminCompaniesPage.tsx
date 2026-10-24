import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { CompanyPayload } from '../api/admin';
import { AdminCredentialsModal } from '../components/admin/AdminCredentialsModal';
import { CompanyFormFields } from '../components/admin/CompanyFormFields';
import { EmployerCredentialsFields } from '../components/admin/EmployerCredentialsFields';
import {
  companyFromRecord,
  emptyCompanyForm,
  emptyEmployerForm,
  sanitizeCompanyPayload,
} from '../components/admin/adminFormUtils';
import { publicFileUrl } from '../api/files';
import type { Company } from '../types/api';

const iconBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: '0.35rem 0.5rem',
  fontSize: '1.1rem',
  lineHeight: 1,
};

export const AdminCompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showRegister, setShowRegister] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<Company | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; temporaryPassword: string } | null>(
    null,
  );

  const [registerCompany, setRegisterCompany] = useState(emptyCompanyForm);
  const [registerEmployer, setRegisterEmployer] = useState(emptyEmployerForm);
  const [canSelfPublishJobs, setCanSelfPublishJobs] = useState(false);

  const [editForm, setEditForm] = useState<CompanyPayload>(emptyCompanyForm());
  const [editVerification, setEditVerification] = useState<Company['verificationStatus']>('verified');

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const companiesQuery = useQuery({
    queryKey: ['admin', 'companies', debouncedSearch],
    queryFn: () => adminApi.listCompanies(debouncedSearch || undefined),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, canSelfPublishJobs: can }: { id: string; canSelfPublishJobs: boolean }) =>
      adminApi.updateCompanyPostingAccess(id, can),
    onSuccess: invalidate,
  });

  const provisionMutation = useMutation({
    mutationFn: () =>
      adminApi.provisionCompany({
        company: sanitizeCompanyPayload(registerCompany),
        employer: registerEmployer,
        verify: true,
        canSelfPublishJobs,
      }),
    onSuccess: (data) => {
      setFormError(null);
      setShowRegister(false);
      setRegisterCompany(emptyCompanyForm());
      setRegisterEmployer(emptyEmployerForm());
      setCanSelfPublishJobs(false);
      setCredentials(data.credentials);
      invalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const payload = sanitizeCompanyPayload(editForm);
      await adminApi.updateCompany(editTarget.id, payload);
      if (editVerification !== editTarget.verificationStatus) {
        await adminApi.verifyCompany(editTarget.id, editVerification);
      }
    },
    onSuccess: () => {
      setFormError(null);
      setEditTarget(null);
      invalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const portalMutation = useMutation({
    mutationFn: ({
      id,
      suspended,
      reason,
    }: {
      id: string;
      suspended: boolean;
      reason?: string;
    }) =>
      adminApi.setCompanyPortalStatus(id, suspended ? 'suspended' : 'active', reason),
    onSuccess: () => {
      setTerminateTarget(null);
      setTerminateReason('');
      invalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const openEdit = (c: Company) => {
    setFormError(null);
    setEditTarget(c);
    setEditForm(companyFromRecord(c));
    setEditVerification(c.verificationStatus);
  };

  const companies = companiesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Registered companies</h1>
          <p className="muted">Register employers, manage posting access, edit profiles, or suspend access.</p>
        </div>
        <button
          type="button"
          className="btn-nav-register"
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={() => {
            setFormError(null);
            setRegisterEmployer(emptyEmployerForm());
            setShowRegister(true);
          }}
        >
          + Register company
        </button>
      </div>

      <div className="form-input-group" style={{ maxWidth: '420px' }}>
        <label htmlFor="co-search">Search companies</label>
        <input
          id="co-search"
          placeholder="Name, email, city, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {formError && !showRegister && !editTarget && !terminateTarget && (
        <div className="alert-box-error">{formError}</div>
      )}

      {companiesQuery.isLoading && <div className="card">Loading companies…</div>}
      {companiesQuery.isError && (
        <div className="alert-box-error">{(companiesQuery.error as Error).message}</div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Company</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Jobs</th>
              <th style={{ padding: '0.75rem' }}>Members</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const suspended = c.portalStatus === 'suspended';
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: suspended ? 0.75 : 1 }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {c.logo?.id ? (
                        <img
                          src={publicFileUrl(c.logo.id)}
                          alt=""
                          style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#64748b',
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong>{c.name}</strong>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {c.slug}
                          {c.email ? ` · ${c.email}` : ''}
                        </div>
                        {(c.contactPerson || c.licenceNumber) && (
                          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            {c.contactPerson ? `HR: ${c.contactPerson}` : ''}
                            {c.contactPerson && c.licenceNumber ? ' · ' : ''}
                            {c.licenceNumber ? `Licence: ${c.licenceNumber}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className="tag-pill">{c.verificationStatus}</span>
                    {suspended && (
                      <span className="tag-pill" style={{ marginLeft: '0.35rem', background: '#fee2e2', color: '#b91c1c' }}>
                        suspended
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{c._count?.jobs ?? 0}</td>
                  <td style={{ padding: '0.75rem' }}>{c._count?.members ?? 0}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        title={c.canSelfPublishJobs ? 'Revoke direct posting' : 'Allow direct posting'}
                        style={iconBtn}
                        disabled={toggleMutation.isPending || suspended}
                        onClick={() =>
                          toggleMutation.mutate({
                            id: c.id,
                            canSelfPublishJobs: !c.canSelfPublishJobs,
                          })
                        }
                      >
                        {c.canSelfPublishJobs ? '🟢' : '⚪'}
                      </button>
                      <button type="button" title="Edit company" style={iconBtn} onClick={() => openEdit(c)}>
                        ✏️
                      </button>
                      {suspended ? (
                        <button
                          type="button"
                          title="Reactivate company"
                          style={iconBtn}
                          disabled={portalMutation.isPending}
                          onClick={() =>
                            portalMutation.mutate({ id: c.id, suspended: false })
                          }
                        >
                          ♻️
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Terminate (suspend login)"
                          style={iconBtn}
                          onClick={() => {
                            setFormError(null);
                            setTerminateTarget(c);
                          }}
                        >
                          🚫
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!companiesQuery.isLoading && companies.length === 0 && (
          <p className="muted" style={{ padding: '1rem' }}>No companies match your search.</p>
        )}
      </div>

      {showRegister && (
        <Modal title="Register company" onClose={() => setShowRegister(false)}>
          {formError && <div className="alert-box-error">{formError}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              provisionMutation.mutate();
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem' }}>Company profile</h3>
            <CompanyFormFields value={registerCompany} onChange={setRegisterCompany} idPrefix="reg" />
            <h3 style={{ margin: '1.25rem 0 0.5rem' }}>Company login</h3>
            <EmployerCredentialsFields value={registerEmployer} onChange={setRegisterEmployer} idPrefix="reg-emp" />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="checkbox"
                checked={canSelfPublishJobs}
                onChange={(e) => setCanSelfPublishJobs(e.target.checked)}
              />
              Allow this company to publish jobs without admin review
            </label>
            <ModalActions
              submitLabel={provisionMutation.isPending ? 'Registering…' : 'Register & create login'}
              pending={provisionMutation.isPending}
              onCancel={() => setShowRegister(false)}
            />
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal title={`Edit — ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          {formError && <div className="alert-box-error">{formError}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
          >
            <CompanyFormFields value={editForm} onChange={setEditForm} idPrefix="edit" />
            <div className="form-input-group">
              <label htmlFor="edit-ver">Verification</label>
              <select
                id="edit-ver"
                value={editVerification}
                onChange={(e) =>
                  setEditVerification(e.target.value as Company['verificationStatus'])
                }
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <ModalActions
              submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
              pending={updateMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          </form>
        </Modal>
      )}

      {terminateTarget && (
        <Modal title={`Terminate — ${terminateTarget.name}`} onClose={() => setTerminateTarget(null)}>
          <p className="muted">
            Members will be unable to log in and the company will be hidden from the public directory until you reactivate.
          </p>
          {formError && <div className="alert-box-error">{formError}</div>}
          <div className="form-input-group">
            <label htmlFor="term-reason">Reason (optional, internal)</label>
            <textarea
              id="term-reason"
              rows={2}
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-auth-submit"
              style={{ width: 'auto', background: '#b91c1c' }}
              disabled={portalMutation.isPending}
              onClick={() =>
                portalMutation.mutate({
                  id: terminateTarget.id,
                  suspended: true,
                  reason: terminateReason,
                })
              }
            >
              {portalMutation.isPending ? 'Suspending…' : 'Confirm terminate'}
            </button>
            <button type="button" className="btn-clear-filters" onClick={() => setTerminateTarget(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {credentials && (
        <AdminCredentialsModal
          email={credentials.email}
          temporaryPassword={credentials.temporaryPassword}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 900,
      padding: '2rem 1rem',
      overflowY: 'auto',
    }}
    onClick={onClose}
  >
    <div
      className="card stack"
      style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button type="button" style={iconBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions: React.FC<{
  submitLabel: string;
  pending: boolean;
  onCancel: () => void;
}> = ({ submitLabel, pending, onCancel }) => (
  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
    <button type="submit" className="btn-auth-submit" style={{ width: 'auto' }} disabled={pending}>
      {submitLabel}
    </button>
    <button type="button" className="btn-clear-filters" onClick={onCancel}>
      Cancel
    </button>
  </div>
);
