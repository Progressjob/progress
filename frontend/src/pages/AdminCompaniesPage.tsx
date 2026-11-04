import { Link } from "react-router-dom";
import { apiDownloadFile } from "../api/client";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import type { CompanyPayload } from "../api/admin";
import { AdminCredentialsModal } from "../components/admin/AdminCredentialsModal";
import { CompanyFormFields } from "../components/admin/CompanyFormFields";
import { EmployerCredentialsFields } from "../components/admin/EmployerCredentialsFields";
import {
  companyFromRecord,
  emptyCompanyForm,
  emptyEmployerForm,
  sanitizeCompanyPayload,
} from "../components/admin/adminFormUtils";
import { CompanyLogoMark } from "../components/CompanyLogoMark";
import type { Company } from "../types/api";

export const AdminCompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedActions, setExpandedActions] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showRegister, setShowRegister] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<Company | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [credentials, setCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [registerCompany, setRegisterCompany] = useState(emptyCompanyForm);
  const [registerEmployer, setRegisterEmployer] = useState(emptyEmployerForm);
  const [canSelfPublishJobs, setCanSelfPublishJobs] = useState(false);

  const [editForm, setEditForm] = useState<CompanyPayload>(emptyCompanyForm());
  const [editReviewNote, setEditReviewNote] = useState("");
  const [editVerification, setEditVerification] =
    useState<Company["verificationStatus"]>("verified");

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const companiesQuery = useQuery({
    queryKey: ["admin", "companies", debouncedSearch],
    queryFn: () => adminApi.listCompanies(debouncedSearch || undefined),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      canSelfPublishJobs: can,
    }: {
      id: string;
      canSelfPublishJobs: boolean;
    }) => adminApi.updateCompanyPostingAccess(id, can),
    onSuccess: invalidate,
  });

  const provisionMutation = useMutation({
    mutationFn: () =>
      adminApi.provisionCompany({
        company: sanitizeCompanyPayload(registerCompany),
        employer: registerEmployer,
        verify: false,
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
      if (
        editVerification !== editTarget.verificationStatus ||
        (payload.businessLicenceFileId && editVerification !== "pending")
      ) {
        await adminApi.verifyCompany(
          editTarget.id,
          editVerification,
          editReviewNote,
        );
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
      adminApi.setCompanyPortalStatus(
        id,
        suspended ? "suspended" : "active",
        reason,
      ),
    onSuccess: () => {
      setTerminateTarget(null);
      setTerminateReason("");
      invalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const openEdit = (c: Company) => {
    setFormError(null);
    setEditReviewNote("");
    setEditTarget(c);
    setEditForm(companyFromRecord(c));
    setEditVerification(c.verificationStatus);
  };

  const allCompanies = companiesQuery.data ?? [];
  const companies = allCompanies.filter(
    (c) =>
      statusFilter === "all" ||
      (statusFilter === "suspended"
        ? c.portalStatus === "suspended"
        : c.verificationStatus === statusFilter),
  );

  return (
    <div className="stack admin-companies-screen">
      <div
        className="page-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <span className="section-eyebrow">Employer management</span>
          <h1>Companies</h1>
          <Link to="/admin/verification" className="company-action-desktop">
            Open employer verification queue →
          </Link>
          <p className="muted">
            Register employers, manage posting access, edit profiles, or suspend
            access.
          </p>
        </div>
        <button
          type="button"
          className="btn-nav-register"
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => {
            setFormError(null);
            setRegisterEmployer(emptyEmployerForm());
            setShowRegister(true);
          }}
        >
          + Register company
        </button>
        <Link to="/admin/verification" className="company-action-mobile companies-verify-link">
          Verification →
        </Link>
      </div>

      <div className="admin-search-wrap" style={{ maxWidth: "440px", marginBottom: "1rem" }}>
        <label htmlFor="co-search" className="notif-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="co-search"
            type="search"
            placeholder="Search by name, email, city, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search companies"
          />
        </label>
      </div>

      {formError && !showRegister && !editTarget && !terminateTarget && (
        <div className="alert-box-error">{formError}</div>
      )}

      {companiesQuery.isLoading && (
        <div className="card">Loading companies…</div>
      )}
      {companiesQuery.isError && (
        <div className="alert-box-error">
          {(companiesQuery.error as Error).message}
        </div>
      )}

      <div className="admin-page-tabs">
        {[
          ["all", "All companies"],
          ["pending", "Pending review"],
          ["verified", "Approved"],
          ["rejected", "Rejected"],
          ["suspended", "Suspended"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={statusFilter === value}
            className={statusFilter === value ? "selected" : ""}
            onClick={() => setStatusFilter(value)}
          >
            {label}
            <span>
              {
                allCompanies.filter(
                  (c) =>
                    value === "all" ||
                    (value === "suspended"
                      ? c.portalStatus === "suspended"
                      : c.verificationStatus === value),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      {(toggleMutation.isError || portalMutation.isError) && (
        <p role="alert" className="alert-box-error">
          {(toggleMutation.error || portalMutation.error)?.message}
        </p>
      )}
      <div className="admin-company-directory">
        {companies.map((c) => {
          const suspended = c.portalStatus === "suspended";
          return (
            <article key={c.id} className="admin-company-row">
              <div className="directory-company-header">
                <div className="directory-company-identity">
                  <CompanyLogoMark
                    name={c.name}
                    logoId={c.logo?.id}
                    className="jb-company-logo jb-company-logo-fallback"
                    imgClassName="jb-company-logo"
                  />
                  <div className="directory-company-text">
                    <h2>{c.name}</h2>
                    <p>{c.email || c.city || "Contact details not provided"}</p>
                    {c.contactPerson && <small>Contact: {c.contactPerson}</small>}
                  </div>
                </div>
                <div className="directory-company-badge-wrap">
                  <span className={`verification-state ${c.verificationStatus}`}>
                    {c.verificationStatus === "verified"
                      ? "Approved"
                      : c.verificationStatus === "pending"
                        ? "Awaiting review"
                        : "Rejected"}
                  </span>
                  {suspended && (
                    <span className="verification-state rejected">Suspended</span>
                  )}
                </div>
              </div>

              <div className="directory-company-meta-strip">
                <span className="directory-meta-pill">
                  {c.canSelfPublishJobs
                    ? "Direct publishing"
                    : "Jobs require review"}
                </span>
                <span className="directory-meta-dot" aria-hidden="true">•</span>
                <Link to={`/admin/jobs?companyId=${c.id}`} className="directory-meta-stat">
                  <strong>{c._count?.jobs ?? 0}</strong> Jobs
                </Link>
                <span className="directory-meta-dot" aria-hidden="true">•</span>
                <span className="directory-meta-stat">
                  <strong>{c._count?.members ?? 0}</strong> Members
                </span>
              </div>

              <div className="directory-company-actions">
                <button type="button" onClick={() => openEdit(c)}>
                  Edit<span className="company-action-desktop"> company</span>
                </button>
                <Link to={`/admin/verification?company=${c.id}`}>
                  <span className="company-action-desktop">Review licence</span>
                  <span className="company-action-mobile">Licence</span>
                </Link>
                <button
                  type="button"
                  className="company-action-more"
                  aria-expanded={expandedActions === c.id}
                  aria-controls={`company-actions-${c.id}`}
                  onClick={() => setExpandedActions(expandedActions === c.id ? null : c.id)}
                >
                  {expandedActions === c.id ? "Less" : "More"}
                </button>
                <div id={`company-actions-${c.id}`} className={`company-secondary-actions${expandedActions === c.id ? " is-open" : ""}`}>
                  <button
                    type="button"
                    disabled={
                      toggleMutation.isPending ||
                      suspended ||
                      c.verificationStatus !== "verified"
                    }
                    onClick={() =>
                      toggleMutation.mutate({
                        id: c.id,
                        canSelfPublishJobs: !c.canSelfPublishJobs,
                      })
                    }
                  >
                    {c.canSelfPublishJobs
                      ? "Require review"
                      : "Allow direct posting"}
                  </button>
                  <button
                    type="button"
                    className={suspended ? "" : "is-danger"}
                    disabled={portalMutation.isPending}
                    onClick={() => {
                      if (suspended)
                        portalMutation.mutate({ id: c.id, suspended: false });
                      else {
                        setFormError(null);
                        setTerminateTarget(c);
                      }
                    }}
                  >
                    {suspended ? "Restore access" : "Suspend access"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!companiesQuery.isLoading && !companies.length && (
          <div className="admin-empty">No companies match your filters.</div>
        )}
      </div>

      {showRegister && (
        <Modal title="Register company" onClose={() => setShowRegister(false)}>
          {formError && <div className="alert-box-error">{formError}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!registerCompany.logoFileId) {
                setFormError("Upload a company logo before registering.");
                return;
              }
              provisionMutation.mutate();
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem" }}>Company profile</h3>
            <CompanyFormFields
              value={registerCompany}
              onChange={setRegisterCompany}
              idPrefix="reg"
            />
            <h3 style={{ margin: "1.25rem 0 0.5rem" }}>Company login</h3>
            <EmployerCredentialsFields
              value={registerEmployer}
              onChange={setRegisterEmployer}
              idPrefix="reg-emp"
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1rem",
              }}
            >
              <input
                type="checkbox"
                disabled
                checked={canSelfPublishJobs}
                onChange={(e) => setCanSelfPublishJobs(e.target.checked)}
              />
              Direct publishing can be enabled after company approval
            </label>
            <ModalActions
              submitLabel={
                provisionMutation.isPending
                  ? "Registering…"
                  : "Register & create login"
              }
              pending={provisionMutation.isPending}
              onCancel={() => setShowRegister(false)}
            />
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal
          title={`Edit — ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
        >
          {formError && <div className="alert-box-error">{formError}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editForm.logoFileId) {
                setFormError("Upload a company logo before saving.");
                return;
              }
              updateMutation.mutate();
            }}
          >
            <CompanyFormFields
              licenceRequired={false}
              value={editForm}
              onChange={setEditForm}
              idPrefix="edit"
            />
            <div className="admin-licence-review-box">
              <h3>Business Licence Verification</h3>
              <p className="admin-licence-review-desc">
                Review the business licence before approving this company.
              </p>
              {editTarget.documents?.[0] ? (
                <button
                  type="button"
                  className="admin-licence-download-btn"
                  onClick={() =>
                    void apiDownloadFile(
                      editTarget.documents![0].fileId,
                      editTarget.documents![0].file?.originalFilename ??
                        "business-licence",
                    ).catch((err: Error) => setFormError(err.message))
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download business licence
                </button>
              ) : (
                <p className="admin-licence-missing-alert">
                  No business licence on file. Approval is blocked until one is
                  uploaded.
                </p>
              )}
              <div className="admin-field-group">
                <label htmlFor="review-note">
                  Review note <small>(required for rejection)</small>
                </label>
                <textarea
                  id="review-note"
                  className="admin-review-textarea"
                  placeholder="Reason for rejection or review notes…"
                  value={editReviewNote}
                  onChange={(e) => setEditReviewNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="admin-field-group">
                <label htmlFor="edit-ver">Licence review decision</label>
                <select
                  id="edit-ver"
                  className="admin-select-field"
                  value={editVerification}
                  onChange={(e) =>
                    setEditVerification(
                      e.target.value as Company["verificationStatus"],
                    )
                  }
                >
                  <option value="pending">Pending review</option>
                  <option
                    value="verified"
                    disabled={
                      !editTarget.documents?.length &&
                      !editForm.businessLicenceFileId
                    }
                  >
                    Approve company
                  </option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <ModalActions
              submitLabel={
                updateMutation.isPending ? "Saving…" : "Save changes"
              }
              pending={updateMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          </form>
        </Modal>
      )}

      {terminateTarget && (
        <Modal
          title={`Terminate — ${terminateTarget.name}`}
          onClose={() => setTerminateTarget(null)}
        >
          <p className="muted">
            Members will be unable to log in and the company will be hidden from
            the public directory until you reactivate.
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
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-auth-submit"
              style={{ width: "auto", background: "#b91c1c" }}
              disabled={portalMutation.isPending}
              onClick={() =>
                portalMutation.mutate({
                  id: terminateTarget.id,
                  suspended: true,
                  reason: terminateReason,
                })
              }
            >
              {portalMutation.isPending ? "Suspending…" : "Confirm terminate"}
            </button>
            <button
              type="button"
              className="btn-clear-filters"
              onClick={() => setTerminateTarget(null)}
            >
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

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div
    role="dialog"
    aria-modal="true"
    className="admin-modal-overlay"
    onClick={onClose}
  >
    <div
      className="admin-modal-dialog"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="admin-modal-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="admin-modal-body">
        {children}
      </div>
    </div>
  </div>
);

const ModalActions: React.FC<{
  submitLabel: string;
  pending: boolean;
  onCancel: () => void;
}> = ({ submitLabel, pending, onCancel }) => (
  <div className="admin-modal-actions">
    <button type="button" className="admin-modal-btn-cancel" onClick={onCancel}>
      Cancel
    </button>
    <button
      type="submit"
      className="admin-modal-btn-primary"
      disabled={pending}
    >
      {submitLabel}
    </button>
  </div>
);
