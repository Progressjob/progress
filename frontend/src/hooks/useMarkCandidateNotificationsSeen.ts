import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { notificationsApi } from '../api/notifications';

/** Marks "new application / resubmitted" employer alerts as read when review UI is opened. */
export function useMarkCandidateNotificationsSeen(companyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId || !user?.id) return;

    let cancelled = false;
    void notificationsApi
      .readByReference({ referenceType: 'candidates', referenceId: companyId })
      .then(() => {
        if (cancelled) return;
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .catch(() => {
        // Non-blocking: badges refresh on the next poll if this fails.
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, user?.id, queryClient]);
}
