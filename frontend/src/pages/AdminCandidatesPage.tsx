import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { AdminCandidateApplicationsModal } from "../components/admin/AdminCandidateApplicationsModal";
import type { AdminCandidateUser } from "../types/api";

export const AdminCandidatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [applicationsFor, setApplicationsFor] =
    useState<AdminCandidateUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const candidatesQuery = useQuery({
    queryKey: ["admin", "candidates", debouncedSearch],
    queryFn: () => adminApi.listCandidates({ q: debouncedSearch || undefined }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      adminApi.setCandidateApplicationAccess(userId, blocked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "candidates"] });
    },
  });

  const allCandidates = candidatesQuery.data ?? [];

  const isBlocked = (c: AdminCandidateUser) =>
    c.profile?.applicationsBlocked === true || c.accountStatus === "suspended";

  const candidates = allCandidates.filter(
    (c) =>
      statusFilter === "all" ||
      (statusFilter === "blocked" ? isBlocked(c) : !isBlocked(c)),
  );

  return (
    <div className="stack">
      <div className="page-header">
        <span className="section-eyebrow">Talent management</span>
        <h1>Candidates</h1>
        <p className="muted">
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"}{" "}
          listed. Use <strong>Block</strong> to stop new job applications (they
          can still sign in and contact admins).
        </p>
      </div>

      <div className="form-input-group" style={{ maxWidth: "420px" }}>
        <label htmlFor="cand-search">Search by name, email, or phone</label>
        <input
          id="cand-search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {candidatesQuery.isLoading && (
        <div className="card">Loading candidates…</div>
      )}
      {candidatesQuery.isError && (
        <div className="alert-box-error">
          {(candidatesQuery.error as Error).message}
        </div>
      )}
      {blockMutation.isError && (
        <div className="alert-box-error">
          {(blockMutation.error as Error).message}
        </div>
      )}

      <div className="admin-page-tabs">
        {[
          ["all", "All candidates"],
          ["active", "Can apply"],
          ["blocked", "Restricted"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={statusFilter === value ? "selected" : ""}
            onClick={() => setStatusFilter(value)}
          >
            {label}
            <span>
              {
                allCandidates.filter(
                  (c) =>
                    value === "all" ||
                    (value === "blocked" ? isBlocked(c) : !isBlocked(c)),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="admin-company-directory">
        {candidates.map((c) => {
          const blocked = isBlocked(c);
          return (
            <article className="admin-candidate-row" key={c.id}>
              <div className="directory-company-identity">
                <span className="directory-person-avatar" aria-hidden="true">
                  {c.firstName?.charAt(0)}
                  {c.lastName?.charAt(0)}
                </span>
                <div>
                  <h2>
                    {c.firstName} {c.lastName}
                  </h2>
                  <p>{c.email || "Email not provided"}</p>
                  <small>{c.phone || "Phone not provided"}</small>
                </div>
              </div>
              <div className="directory-company-state">
                <span
                  className={`verification-state ${blocked ? "rejected" : "verified"}`}
                >
                  {c.accountStatus === "suspended"
                    ? "Account suspended"
                    : blocked
                      ? "Applications blocked"
                      : "Can apply"}
                </span>
                <small>
                  {blocked
                    ? "New applications are restricted"
                    : "Account ready for opportunities"}
                </small>
              </div>
              <div className="directory-company-counts">
                <div>
                  <strong>{c.stats.applicationsCount}</strong>
                  <small>Applications</small>
                </div>
              </div>
              <div className="directory-company-actions">
                <button
                  disabled={!c.stats.applicationsCount}
                  onClick={() => setApplicationsFor(c)}
                >
                  View applications
                </button>
                <button
                  className={blocked ? "" : "is-danger"}
                  disabled={
                    blockMutation.isPending || c.accountStatus === "suspended"
                  }
                  onClick={() =>
                    blockMutation.mutate({ userId: c.id, blocked: !blocked })
                  }
                >
                  {blocked ? "Allow applications" : "Block applications"}
                </button>
              </div>
            </article>
          );
        })}
        {!candidatesQuery.isLoading && !candidates.length && (
          <div className="admin-empty">No candidates match your filters.</div>
        )}
      </div>

      {applicationsFor && (
        <AdminCandidateApplicationsModal
          candidate={applicationsFor}
          onClose={() => setApplicationsFor(null)}
        />
      )}
    </div>
  );
};
