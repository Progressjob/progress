import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { apiDownloadFile } from "../api/client";
import type { Company } from "../types/api";
import { CompanyLogoMark } from "../components/CompanyLogoMark";
export function AdminVerificationPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(
    params.get("company") ? "all" : "pending",
  );
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "companies", "verification"],
    queryFn: () => adminApi.listCompanies(),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: ({
      company,
      decision,
    }: {
      company: Company;
      decision: "verified" | "rejected";
    }) =>
      adminApi.verifyCompany(
        company.id,
        decision,
        notes[company.id],
        company.documents?.[0]?.id,
      ),
    onSuccess: () => {
      setError("");
      void client.invalidateQueries({ queryKey: ["admin"] });
      void client.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => setError(err.message),
  });
  const all = query.data ?? [];
  const rows = all.filter(
    (c) =>
      (status === "all" || c.verificationStatus === status) &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  rows.sort(
    (a, b) =>
      Number(b.id === params.get("company")) -
      Number(a.id === params.get("company")),
  );
  return (
    <div className="admin-screen">
      <header className="admin-screen-header">
        <div>
          <span className="section-eyebrow">Employer onboarding</span>
          <h1>Company verification</h1>
          <p>
            Review business licences before enabling employers to post jobs.
          </p>
        </div>
        <span className="admin-count-badge">
          {all.filter((c) => c.verificationStatus === "pending").length}{" "}
          awaiting review
        </span>
      </header>
      <div className="admin-filter-bar">
        {["pending", "verified", "rejected", "all"].map((s) => (
          <button
            key={s}
            className={status === s ? "selected" : ""}
            onClick={() => setStatus(s)}
          >
            {s === "verified" ? "Approved" : s}
          </button>
        ))}
        <input
          aria-label="Search companies"
          placeholder="Search company name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {(query.isError || error) && (
        <p className="alert-box-error" role="alert">
          {error || query.error?.message}
        </p>
      )}
      {query.isLoading ? (
        <p>Loading verification queue…</p>
      ) : !rows.length ? (
        <div className="admin-empty">No companies in this queue.</div>
      ) : (
        <div className="admin-verification-grid">
          {rows.map((c) => (
            <article className="admin-review-card" key={c.id}>
              <div className="admin-review-brand">
                <CompanyLogoMark
                  name={c.name}
                  logoId={c.logo?.id}
                  className="jb-company-logo jb-company-logo-fallback"
                  imgClassName="jb-company-logo"
                />
                <div>
                  <h2>{c.name}</h2>
                  <p>{c.email || c.phone || "No contact provided"}</p>
                </div>
                <span className={`verification-state ${c.verificationStatus}`}>
                  {c.verificationStatus}
                </span>
              </div>
              <p>
                {c.city || "City not provided"} ·{" "}
                {c.contactPerson || "Contact person not provided"}
              </p>
              {c.documents?.[0] ? (
                <button
                  className="admin-document-button"
                  onClick={() =>
                    void apiDownloadFile(
                      c.documents![0].fileId,
                      c.documents![0].file?.originalFilename ??
                        "business-licence",
                    ).catch((e: Error) => setError(e.message))
                  }
                >
                  ↓ Download business licence
                </button>
              ) : (
                <p className="admin-review-note">
                  No licence on file. Approval is blocked until the company
                  uploads one.
                </p>
              )}
              {c.documents?.[0]?.reviewNote && (
                <p className="admin-review-note">
                  Previous review: {c.documents[0].reviewNote}
                </p>
              )}
              <label className="admin-review-label" htmlFor={`note-${c.id}`}>
                Review note (required when rejecting)
              </label>
              <textarea
                id={`note-${c.id}`}
                maxLength={2000}
                rows={2}
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                placeholder="Explain any corrections the company needs to make…"
              />
              <div className="admin-row-actions">
                <button
                  className="btn-nav-register"
                  disabled={
                    mutation.isPending ||
                    !c.documents?.length ||
                    c.verificationStatus === "verified"
                  }
                  onClick={() =>
                    mutation.mutate({ company: c, decision: "verified" })
                  }
                >
                  Approve employer
                </button>
                <button
                  disabled={
                    mutation.isPending ||
                    !notes[c.id]?.trim() ||
                    c.verificationStatus === "rejected"
                  }
                  onClick={() =>
                    mutation.mutate({ company: c, decision: "rejected" })
                  }
                >
                  Reject licence
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
