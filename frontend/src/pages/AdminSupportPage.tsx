import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}
interface Report {
  id: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  job: { title: string };
}
export function AdminSupportPage() {
  const [params, setParams] = useSearchParams();
  const reports = params.get("tab") === "reports";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const client = useQueryClient();
  const messages = useQuery({
    queryKey: ["admin", "support", "messages"],
    queryFn: () => apiFetch<Message[]>("/admin/contact-messages"),
    refetchInterval: 30000,
  });
  const reportQuery = useQuery({
    queryKey: ["admin", "support", "reports"],
    queryFn: () => apiFetch<Report[]>("/admin/reports"),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/admin/${reports ? "reports" : "contact-messages"}/${id}`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
  });
  const rows = (
    reports
      ? (reportQuery.data ?? []).map((r) => ({
          id: r.id,
          subject: r.job.title,
          message: [r.reason, r.description].filter(Boolean).join("\n"),
          name: "Job report",
          email: "",
          status: r.status,
          createdAt: r.createdAt,
        }))
      : (messages.data ?? [])
  ).filter(
    (m) =>
      (filter === "all" || m.status === filter) &&
      `${m.name} ${m.subject} ${m.email} ${m.message}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  rows.sort(
    (a, b) =>
      Number(b.id === params.get("message")) -
      Number(a.id === params.get("message")),
  );
  const statuses = reports
    ? ["pending", "reviewing", "resolved", "dismissed"]
    : ["new", "in_progress", "resolved"];
  return (
    <div className="admin-screen">
      <header className="admin-screen-header">
        <div>
          <span className="section-eyebrow">Help desk</span>
          <h1>Support inbox</h1>
          <p>
            Manage contact-form enquiries and investigate reported vacancies.
          </p>
        </div>
      </header>
      <div className="admin-filter-bar">
        <button
          className={!reports ? "selected" : ""}
          onClick={() => {
            setParams({});
            setFilter("all");
          }}
        >
          Messages (
          {messages.data?.filter((m) => m.status === "new").length ?? 0} new)
        </button>
        <button
          className={reports ? "selected" : ""}
          onClick={() => {
            setParams({ tab: "reports" });
            setFilter("all");
          }}
        >
          Job reports
        </button>
        <select
          aria-label="Filter by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <input
          aria-label="Search support inbox"
          placeholder="Search inbox…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {(messages.isError || reportQuery.isError || mutation.isError) && (
        <p className="alert-box-error" role="alert">
          {(messages.error || reportQuery.error || mutation.error)?.message}
        </p>
      )}
      {(reports ? reportQuery.isLoading : messages.isLoading) ? (
        <p>Loading inbox…</p>
      ) : !rows.length ? (
        <div className="admin-empty">No items match your filters.</div>
      ) : (
        <div className="admin-inbox-list">
          {rows.map((m) => (
            <article key={m.id} className="admin-inbox-card">
              <div>
                <h2>{m.subject}</h2>
                <small>
                  {m.name} {m.email && `· ${m.email}`} ·{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </small>
                <p className="support-message-body">{m.message}</p>
              </div>
              <div className="admin-row-actions">
                <select
                  aria-label={`Status for ${m.subject}`}
                  value={m.status}
                  disabled={mutation.isPending}
                  onChange={(e) =>
                    mutation.mutate({ id: m.id, status: e.target.value })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                {m.email && (
                  <a
                    href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                  >
                    Reply by email ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
