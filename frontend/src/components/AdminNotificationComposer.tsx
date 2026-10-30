import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

type Recipient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};
type Audience = "selected" | "employer" | "candidate";
type Draft = {
  audience: Audience;
  userIds?: string[];
  title: string;
  message: string;
};
type Preview = Draft & { expectedRecipientCount: number; requestId: string };
type Sent = {
  id: string;
  createdAt: string;
  actor: { firstName: string; lastName: string };
  details: {
    title: string;
    message: string;
    audience: string;
    recipientCount: number;
  };
};

export function AdminNotificationComposer() {
  const [audience, setAudience] = useState<Audience>("selected");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [success, setSuccess] = useState("");
  const client = useQueryClient();
  const recipients = useQuery({
    queryKey: ["admin", "notification-recipients", search],
    queryFn: () =>
      apiFetch<Recipient[]>(
        `/notifications/admin/recipients?q=${encodeURIComponent(search)}`,
      ),
    enabled: audience === "selected",
  });
  const history = useQuery({
    queryKey: ["admin", "notification-history"],
    queryFn: () => apiFetch<Sent[]>("/notifications/admin/sent"),
  });
  const previewMutation = useMutation({
    mutationFn: (draft: Draft) =>
      apiFetch<{ count: number }>("/notifications/admin/preview", {
        method: "POST",
        body: { audience: draft.audience, userIds: draft.userIds },
      }),
    onSuccess: (result, draft) => {
      setSuccess("");
      setPreview({
        ...draft,
        expectedRecipientCount: result.count,
        requestId: crypto.randomUUID(),
      });
    },
  });
  const sendMutation = useMutation({
    mutationFn: (draft: Preview) =>
      apiFetch<{ recipientCount: number }>("/notifications/admin/send", {
        method: "POST",
        body: draft,
      }),
    onSuccess: (result) => {
      setSuccess(
        `Notification delivered to ${result.recipientCount} account${result.recipientCount === 1 ? "" : "s"}.`,
      );
      setPreview(null);
      setTitle("");
      setMessage("");
      setSelected([]);
      void client.invalidateQueries({
        queryKey: ["admin", "notification-history"],
      });
      void client.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const busy = previewMutation.isPending || sendMutation.isPending;
  const changed = () => {
    setPreview(null);
    setSuccess("");
    previewMutation.reset();
    sendMutation.reset();
  };
  return (
    <div className="admin-compose-layout">
      <section className="admin-compose-panel">
        <header>
          <span className="section-eyebrow">Send an update</span>
          <h2>Compose notification</h2>
          <p>
            Deliver an in-app message to specific people or a role-based
            audience.
          </p>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            previewMutation.mutate({
              audience,
              userIds:
                audience === "selected" ? selected.map((u) => u.id) : undefined,
              title: title.trim(),
              message: message.trim(),
            });
          }}
        >
          <fieldset disabled={busy}>
            <label htmlFor="notify-audience">1. Choose recipients</label>
            <select
              id="notify-audience"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as Audience);
                changed();
              }}
            >
              <option value="selected">
                Specific people — one or multiple
              </option>
              <option value="employer">All active employers</option>
              <option value="candidate">All active candidates</option>
            </select>
            {audience === "selected" ? (
              <>
                <input
                  aria-label="Search recipients"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {selected.length > 0 && (
                  <div className="recipient-chips">
                    {selected.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setSelected(selected.filter((r) => r.id !== u.id));
                          changed();
                        }}
                      >
                        {u.firstName} {u.lastName}{" "}
                        <span aria-label="Remove">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="recipient-options"
                  aria-label="Available recipients"
                >
                  {recipients.isLoading ? (
                    <p>Finding accounts…</p>
                  ) : recipients.isError ? (
                    <p role="alert">Could not load accounts.</p>
                  ) : !recipients.data?.length ? (
                    <p>No active accounts found.</p>
                  ) : (
                    recipients.data.map((u) => (
                      <label key={u.id}>
                        <input
                          type="checkbox"
                          checked={selected.some((r) => r.id === u.id)}
                          onChange={(e) => {
                            setSelected(
                              e.target.checked
                                ? [...selected, u]
                                : selected.filter((r) => r.id !== u.id),
                            );
                            changed();
                          }}
                        />
                        <span>
                          <strong>
                            {u.firstName} {u.lastName}
                          </strong>
                          <small>{u.email || "No email address"}</small>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="muted">
                  {selected.length} selected · Search shows up to 20 active
                  accounts. Maximum 500 selected.
                </p>
              </>
            ) : (
              <p className="admin-review-note">
                This includes every active account with the {audience} role.
                Accounts with both roles receive the message only once.
              </p>
            )}
            <label htmlFor="notify-title">2. Write your message</label>
            <input
              id="notify-title"
              required
              maxLength={200}
              placeholder="Notification title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                changed();
              }}
            />
            <textarea
              aria-label="Notification message"
              required
              maxLength={5000}
              rows={6}
              placeholder="What should your recipients know?"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                changed();
              }}
            />
            <small>
              {message.length.toLocaleString()} / 5,000 characters · In-app
              delivery only
            </small>
            <button
              className="btn-nav-register"
              type="submit"
              disabled={
                !title.trim() ||
                !message.trim() ||
                (audience === "selected" &&
                  (!selected.length || selected.length > 500))
              }
            >
              {previewMutation.isPending
                ? "Checking audience…"
                : "Preview notification"}
            </button>
          </fieldset>
        </form>
        {(previewMutation.isError || sendMutation.isError) && (
          <p className="alert-box-error" role="alert">
            {(previewMutation.error || sendMutation.error)?.message}
          </p>
        )}
        {success && (
          <p className="admin-send-success" role="status">
            {success}
          </p>
        )}
        {preview && (
          <section className="notification-preview">
            <span className="section-eyebrow">3. Review & send</span>
            <h3>{preview.title}</h3>
            <p className="support-message-body">{preview.message}</p>
            <p>
              <strong>{preview.expectedRecipientCount}</strong> active recipient
              {preview.expectedRecipientCount === 1 ? "" : "s"} ·{" "}
              {preview.audience === "selected"
                ? "Selected accounts"
                : `${preview.audience}s`}
            </p>
            <button
              className="btn-nav-register"
              disabled={busy || !preview.expectedRecipientCount}
              onClick={() => sendMutation.mutate(preview)}
            >
              {sendMutation.isPending
                ? "Sending…"
                : `Send to ${preview.expectedRecipientCount} recipient${preview.expectedRecipientCount === 1 ? "" : "s"}`}
            </button>
          </section>
        )}
      </section>
      <aside className="admin-compose-panel">
        <span className="section-eyebrow">Delivery history</span>
        <h2>Sent notifications</h2>
        <p>The latest 100 sends by platform administrators.</p>
        {history.isError && <p role="alert">Could not load sent history.</p>}
        {history.isLoading ? (
          <p>Loading history…</p>
        ) : !history.data?.length ? (
          <div className="admin-empty">No notifications sent yet.</div>
        ) : (
          history.data.map((item) => (
            <details className="sent-notification" key={item.id}>
              <summary>
                <strong>{item.details.title}</strong>
                <small>
                  {item.details.recipientCount} recipients ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </small>
              </summary>
              <p className="support-message-body">{item.details.message}</p>
              <small>
                Sent by {item.actor.firstName} {item.actor.lastName} ·{" "}
                {item.details.audience}
              </small>
            </details>
          ))
        )}
      </aside>
    </div>
  );
}
