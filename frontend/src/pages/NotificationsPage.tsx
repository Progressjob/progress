import { AdminNotificationComposer } from "../components/AdminNotificationComposer";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  notificationsApi,
  type Notification,
  type NotificationCategory,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { BackButton } from "../components/BackButton";

const CATEGORIES: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "support", label: "Support" },
  { id: "reports", label: "Reports" },
  { id: "companies", label: "Companies" },
  { id: "jobs", label: "Jobs" },
  { id: "applications", label: "Applications" },
  { id: "messages", label: "Messages" },
];

const DATE_PRESETS = [
  { id: "all", label: "Any time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "custom", label: "Custom range" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["id"];

function categoryOf(n: Notification): Exclude<NotificationCategory, "all"> {
  switch (n.type) {
    case "support_message":
      return "support";
    case "job_report":
      return "reports";
    case "company_review":
    case "company_verification":
      return "companies";
    case "job_pending_review":
      return "jobs";
    case "application_update":
      return "applications";
    case "admin_message":
      return "messages";
    default:
      if (n.referenceType === "contact") return "support";
      if (n.referenceType === "report") return "reports";
      if (n.referenceType === "company") return "companies";
      if (n.referenceType === "job") return "jobs";
      if (n.referenceType === "application") return "applications";
      return "messages";
  }
}

function categoryLabel(id: Exclude<NotificationCategory, "all">) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Update";
}

function rangeFromPreset(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  if (preset === "custom") {
    return {
      ...(customFrom ? { from: new Date(`${customFrom}T00:00:00`).toISOString() } : {}),
      ...(customTo ? { to: new Date(`${customTo}T23:59:59.999`).toISOString() } : {}),
    };
  }
  if (preset === "all") return {};
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString() };
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const { user, hasRole } = useAuth();
  const admin = hasRole("admin", "moderator");
  const [tab, setTab] = useState<"compose" | "inbox">("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const client = useQueryClient();

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const dateRange = useMemo(
    () => rangeFromPreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const listKey = [
    "notifications",
    user?.id,
    "list",
    category,
    unreadOnly,
    search,
    dateRange.from ?? "",
    dateRange.to ?? "",
  ] as const;

  const query = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) =>
      notificationsApi.list({
        category,
        unread: unreadOnly || undefined,
        q: search || undefined,
        from: dateRange.from,
        to: dateRange.to,
        before: pageParam,
        limit: 40,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30000,
    enabled: Boolean(user) && (!admin || tab === "inbox"),
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications", user?.id, "unread"],
    queryFn: notificationsApi.unread,
    enabled: Boolean(user),
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
      return `/admin/support/reports/${n.referenceId}`;
    if (!admin && n.referenceType === "application" && hasRole("candidate"))
      return "/candidate/applications";
    if (admin && n.referenceType === "job")
      return `/admin/jobs/${n.referenceId}`;
    return null;
  };

  const rows = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );
  const unreadTotal = unreadQuery.data ?? 0;
  const hasMore = Boolean(query.hasNextPage);

  return (
    <div className="admin-screen notifications-screen">
      <BackButton fallback={admin ? "/admin" : "/"} />
      <header className="admin-screen-header">
        <div>
          <span className="section-eyebrow">Activity centre</span>
          <h1>Notifications</h1>
          <p>
            {admin
              ? "Send targeted updates, track deliveries, and review your inbox."
              : "Search, filter, and review your latest updates."}
          </p>
        </div>
        {(!admin || tab === "inbox") && (
          <button
            className="btn-nav-register"
            disabled={mutation.isPending || unreadTotal === 0}
            onClick={() => mutation.mutate(undefined)}
          >
            Mark all as read
          </button>
        )}
      </header>

      {admin && (
        <div className="admin-page-tabs">
          <button
            type="button"
            className={tab === "compose" ? "selected" : ""}
            onClick={() => setTab("compose")}
          >
            Compose & sent history
          </button>
          <button
            type="button"
            className={tab === "inbox" ? "selected" : ""}
            onClick={() => setTab("inbox")}
          >
            My inbox
            {unreadTotal > 0 ? (
              <span className="notif-tab-count">{unreadTotal}</span>
            ) : null}
          </button>
        </div>
      )}

      {admin && tab === "compose" ? (
        <AdminNotificationComposer />
      ) : (
        <div className="notif-inbox-panel">
          <div className="notif-toolbar">
            <label className="notif-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search titles, names, or messages…"
                aria-label="Search notifications"
              />
            </label>

            <div className="notif-toolbar-side">
              <div className="notif-segment" role="group" aria-label="Read status">
                <button
                  type="button"
                  className={!unreadOnly ? "selected" : ""}
                  onClick={() => setUnreadOnly(false)}
                >
                  All
                </button>
                <button
                  type="button"
                  className={unreadOnly ? "selected" : ""}
                  onClick={() => setUnreadOnly(true)}
                >
                  Unread
                </button>
              </div>

              <label className="notif-date-select">
                <span className="visually-hidden">Date range</span>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  aria-label="Date range"
                >
                  {DATE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {datePreset === "custom" && (
            <div className="notif-date-custom">
              <label>
                From
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="notif-category-bar" role="tablist" aria-label="Categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                className={category === c.id ? "selected" : ""}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {(query.isError || mutation.isError) && (
            <p role="alert" className="alert-box-error">
              {(query.error || mutation.error)?.message}
            </p>
          )}

          {query.isLoading ? (
            <div className="notif-loading">Loading notifications…</div>
          ) : !rows.length ? (
            <div className="admin-empty">
              No {unreadOnly ? "unread " : ""}
              {category !== "all" ? `${categoryLabel(category).toLowerCase()} ` : ""}
              notifications
              {search ? ` matching “${search}”` : ""}.
            </div>
          ) : (
            <ul className="notif-list">
              {rows.map((n) => {
                const cat = categoryOf(n);
                const href = target(n);
                const unread = !n.readAt;
                return (
                  <li
                    key={n.id}
                    className={`notif-item ${unread ? "is-unread" : ""}`}
                  >
                    <span className="notif-unread-dot" aria-hidden={!unread} />
                    <div className="notif-item-main">
                      <div className="notif-item-top">
                        <span className={`notif-cat notif-cat-${cat}`}>
                          {categoryLabel(cat)}
                        </span>
                        <time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>
                          {formatWhen(n.createdAt)}
                        </time>
                      </div>
                      <h2 className={unread ? "is-unread-title" : undefined}>{n.title}</h2>
                      <p>{n.message}</p>
                      <div className="notif-item-actions">
                        {href && (
                          <Link
                            to={href}
                            onClick={() => {
                              if (unread) mutation.mutate(n.id);
                            }}
                          >
                            Open details →
                          </Link>
                        )}
                        {unread && (
                          <button
                            type="button"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate(n.id)}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="notif-load-more">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage
                  ? "Loading older…"
                  : "Load older notifications"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
