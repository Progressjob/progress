import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { notificationsApi, type UnreadCountParams } from '../api/notifications';

export function MenuNotificationBadge({ references, scopes }: {
  references?: string[];
  scopes?: UnreadCountParams[];
}) {
  const { user } = useAuth();
  const requested: UnreadCountParams[] | undefined = scopes ?? references?.map((referenceType) => ({ referenceType }));
  const unique = new Map<string, UnreadCountParams>();
  for (const filter of requested ?? []) {
    unique.set(JSON.stringify([filter.referenceType, filter.referenceId]), filter);
  }
  const filters = requested ? [...unique.values()].filter((filter) =>
    !filter.referenceId || !unique.has(JSON.stringify([filter.referenceType, undefined])),
  ) : undefined;
  const query = useQuery({
    queryKey: filters
      ? ['notifications', user?.id, 'menu-unread', filters]
      : ['notifications', user?.id, 'unread'],
    queryFn: async () => {
      if (!filters) return notificationsApi.unread();
      const counts = await Promise.all(filters.map((filter) =>
        notificationsApi.unread(filter),
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
