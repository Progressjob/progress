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

export interface UnreadCountParams {
  referenceType?: string;
  referenceId?: string;
}

function unreadQuery(params?: UnreadCountParams): string {
  if (!params?.referenceType && !params?.referenceId) return "";
  const search = new URLSearchParams();
  if (params.referenceType) search.set("referenceType", params.referenceType);
  if (params.referenceId) search.set("referenceId", params.referenceId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const notificationsApi = {
  list: (params?: NotificationListQuery) =>
    apiFetch<NotificationListResponse>(`/notifications${toQuery(params)}`),
  unread: (params?: UnreadCountParams) =>
    apiFetch<number>(`/notifications/unread-count${unreadQuery(params)}`),
  read: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
  readByReference: (payload: { referenceType: string; referenceId: string }) =>
    apiFetch<{ count: number }>("/notifications/read-by-reference", {
      method: "PATCH",
      body: payload,
    }),
};
