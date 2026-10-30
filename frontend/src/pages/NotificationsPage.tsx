import { AdminNotificationComposer } from "../components/AdminNotificationComposer";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { BackButton } from "../components/BackButton";
export function NotificationsPage() {
  const { user, hasRole } = useAuth();
  const admin = hasRole("admin", "moderator");
  const [tab, setTab] = useState("compose");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", user?.id, "list"],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: (id?: string) =>
      id ? notificationsApi.read(id) : notificationsApi.readAll(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const target = (n: Notification) => {
    if (n.referenceType === "company")
      return admin
        ? `/admin/verification?company=${n.referenceId}`
        : `/company/${n.referenceId}/jobs`;
    if (admin && n.referenceType === "contact")
      return `/admin/support?message=${n.referenceId}`;
    if (admin && n.referenceType === "report")
      return "/admin/support?tab=reports";
    if (!admin && n.referenceType === "application" && hasRole("candidate"))
      return "/candidate/applications";
    if (admin && n.referenceType === "job")
      return `/admin/jobs/${n.referenceId}`;
    return null;
  };
  const rows = (query.data ?? []).filter((n) => !unreadOnly || !n.readAt);
  return (
    <div className="admin-screen">
      <BackButton fallback={admin ? "/admin" : "/"} />
      <header className="admin-screen-header">
        <div>
          <span className="section-eyebrow">Activity centre</span>
          <h1>Notifications</h1>
          <p>
            {admin
              ? "Send targeted updates, track deliveries, and review your inbox."
              : "Your latest 100 updates. New updates appear automatically."}
          </p>
        </div>
        {(!admin || tab === "inbox") && (
          <button
            className="btn-nav-register"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(undefined)}
          >
            Mark all as read
          </button>
        )}
      </header>
      {admin && (
        <div className="admin-page-tabs">
          <button
            className={tab === "compose" ? "selected" : ""}
            onClick={() => setTab("compose")}
          >
            Compose & sent history
          </button>
          <button
            className={tab === "inbox" ? "selected" : ""}
            onClick={() => setTab("inbox")}
          >
            My inbox
          </button>
        </div>
      )}
      {admin && tab === "compose" ? (
        <AdminNotificationComposer />
      ) : (
        <>
          <div className="admin-filter-bar">
            <button
              className={!unreadOnly ? "selected" : ""}
              onClick={() => setUnreadOnly(false)}
            >
              All updates
            </button>
            <button
              className={unreadOnly ? "selected" : ""}
              onClick={() => setUnreadOnly(true)}
            >
              Unread
            </button>
          </div>
          {(query.isError || mutation.isError) && (
            <p role="alert" className="alert-box-error">
              {(query.error || mutation.error)?.message}
            </p>
          )}
          {query.isLoading ? (
            <p>Loading notifications…</p>
          ) : !rows.length ? (
            <div className="admin-empty">
              No {unreadOnly ? "unread " : ""}notifications.
            </div>
          ) : (
            <div className="admin-inbox-list">
              {rows.map((n) => (
                <article
                  key={n.id}
                  className={`admin-inbox-card ${!n.readAt ? "is-unread" : ""}`}
                >
                  <div>
                    <h2>{n.title}</h2>
                    <p>{n.message}</p>
                    <time>{new Date(n.createdAt).toLocaleString()}</time>
                  </div>
                  <div className="admin-row-actions">
                    {target(n) && (
                      <Link
                        to={target(n)!}
                        onClick={() => {
                          if (!n.readAt) mutation.mutate(n.id);
                        }}
                      >
                        Open details →
                      </Link>
                    )}
                    {!n.readAt && (
                      <button
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
