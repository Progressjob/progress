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
    <div className="stack">
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
          <Link to="/admin/verification">
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
      </div>

      <div className="form-input-group" style={{ maxWidth: "420px" }}>
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
              <div className="directory-company-identity">
                <CompanyLogoMark
                  name={c.name}
                  logoId={c.logo?.id}
                  className="jb-company-logo jb-company-logo-fallback"
                  imgClassName="jb-company-logo"
                />
                <div>
                  <h2>{c.name}</h2>
                  <p>{c.email || c.city || "Contact details not provided"}</p>
                  {c.contactPerson && <small>Contact: {c.contactPerson}</small>}
                </div>
              </div>
              <div className="directory-company-state">
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
                <small>
                  {c.canSelfPublishJobs
                    ? "Direct publishing enabled"
                    : "Jobs require admin review"}
                </small>
              </div>
              <div className="directory-company-counts">
                <Link to={`/admin/jobs?companyId=${c.id}`}>
                  <strong>{c._count?.jobs ?? 0}</strong>
                  <small>Jobs</small>
                </Link>
                <div>
                  <strong>{c._count?.members ?? 0}</strong>
                  <small>Members</small>
                </div>
              </div>
              <div className="directory-company-actions">
                <button onClick={() => openEdit(c)}>Edit company</button>
                <Link to={`/admin/verification?company=${c.id}`}>
                  Review licence
                </Link>
                <button
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
                    ? "Require job review"
                    : "Allow direct posting"}
                </button>
                <button
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
            <div className="form-input-group">
              <p>Review the business licence before approving this company.</p>
              {editTarget.documents?.[0] ? (
                <button
                  type="button"
                  onClick={() =>
                    void apiDownloadFile(
                      editTarget.documents![0].fileId,
                      editTarget.documents![0].file?.originalFilename ??
                        "business-licence",
                    ).catch((err: Error) => setFormError(err.message))
                  }
                >
                  Download business licence
                </button>
              ) : (
                <p>
                  No business licence on file. Approval is blocked until one is
                  uploaded.
                </p>
              )}
              <label htmlFor="review-note">
                Review note (required for rejection)
              </label>
              <textarea
                id="review-note"
                value={editReviewNote}
                onChange={(e) => setEditReviewNote(e.target.value)}
              />
              <label htmlFor="edit-ver">Licence review decision</label>
              <select
                id="edit-ver"
                value={editVerification}
                onChange={(e) =>
                  setEditVerification(
                    e.target.value as Company["verificationStatus"],
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="pending">Pending</option>
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
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.55)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      zIndex: 900,
      padding: "2rem 1rem",
      overflowY: "auto",
    }}
    onClick={onClose}
  >
    <div
      className="card stack"
      style={{
        maxWidth: "720px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
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
  <div
    style={{
      display: "flex",
      gap: "0.75rem",
      marginTop: "1.25rem",
      flexWrap: "wrap",
    }}
  >
    <button
      type="submit"
      className="btn-auth-submit"
      style={{ width: "auto" }}
      disabled={pending}
    >
      {submitLabel}
    </button>
    <button type="button" className="btn-clear-filters" onClick={onCancel}>
      Cancel
    </button>
  </div>
);
