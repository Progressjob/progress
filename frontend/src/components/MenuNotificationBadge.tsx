import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { notificationsApi } from '../api/notifications';

export function MenuNotificationBadge({ references }: { references?: string[] }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: references
      ? ['notifications', user?.id, 'menu-unread', ...references]
      : ['notifications', user?.id, 'unread'],
    queryFn: async () => {
      if (!references) return notificationsApi.unread();
      const counts = await Promise.all(references.map((referenceType) =>
        notificationsApi.unread({ referenceType }),
      ));
      return counts.reduce((sum, count) => sum + count, 0);
    },
    enabled: Boolean(user),
    refetchInterval: 30000,
  });
  const count = query.data ?? 0;
  if (!count) return null;
  return <span className="menu-unread-badge" aria-label={`${count} unread notifications`}>{count > 99 ? '99+' : count}</span>;
}
