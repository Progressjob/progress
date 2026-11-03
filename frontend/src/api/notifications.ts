import { apiFetch } from "./client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  readAt: string | null;
  createdAt: string;
}

export type NotificationCategory =
  | "all"
  | "support"
  | "reports"
  | "companies"
  | "jobs"
  | "applications"
  | "messages";

export interface NotificationListQuery {
  q?: string;
  category?: NotificationCategory;
  unread?: boolean;
  from?: string;
  to?: string;
  before?: string;
  limit?: number;
}

export interface NotificationListResponse {
  items: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
}

function toQuery(params: NotificationListQuery = {}): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params.unread) search.set("unread", "true");
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.before) search.set("before", params.before);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const notificationsApi = {
  list: (params?: NotificationListQuery) =>
    apiFetch<NotificationListResponse>(`/notifications${toQuery(params)}`),
  unread: () => apiFetch<number>("/notifications/unread-count"),
  read: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
};
