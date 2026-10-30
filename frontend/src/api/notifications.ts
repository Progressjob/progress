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
export const notificationsApi = {
  list: () => apiFetch<Notification[]>("/notifications"),
  unread: () => apiFetch<number>("/notifications/unread-count"),
  read: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
};
