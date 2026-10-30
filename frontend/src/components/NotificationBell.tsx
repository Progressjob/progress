import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";
export function NotificationBell() {
  const { user, hasRole } = useAuth();
  const query = useQuery({
    queryKey: ["notifications", user?.id, "unread"],
    queryFn: notificationsApi.unread,
    enabled: Boolean(user),
    refetchInterval: 30000,
  });
  if (!user) return null;
  const count = query.data ?? 0;
  return (
    <Link
      className="notification-bell"
      to={
        hasRole("admin", "moderator")
          ? "/admin/notifications"
          : "/notifications"
      }
      aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
