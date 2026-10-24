import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import type { AdminCandidateUser } from '../types/api';

export const AdminCandidatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const candidatesQuery = useQuery({
    queryKey: ['admin', 'candidates', debouncedSearch],
    queryFn: () => adminApi.listCandidates({ q: debouncedSearch || undefined }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      adminApi.setCandidateApplicationAccess(userId, blocked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'candidates'] });
    },
  });

  const candidates = candidatesQuery.data ?? [];

  const isBlocked = (c: AdminCandidateUser) =>
    c.profile?.applicationsBlocked === true || c.accountStatus === 'suspended';

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Registered candidates</h1>
        <p className="muted">
          {candidates.length} candidate{candidates.length === 1 ? '' : 's'} listed. Use{' '}
          <strong>Block</strong> to stop new job applications (they can still sign in and contact admins).
        </p>
      </div>

      <div className="form-input-group" style={{ maxWidth: '420px' }}>
        <label htmlFor="cand-search">Search by name, email, or phone</label>
        <input
          id="cand-search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {candidatesQuery.isLoading && <div className="card">Loading candidates…</div>}
      {candidatesQuery.isError && (
        <div className="alert-box-error">{(candidatesQuery.error as Error).message}</div>
      )}
      {blockMutation.isError && (
        <div className="alert-box-error">{(blockMutation.error as Error).message}</div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        {!candidatesQuery.isLoading && candidates.length > 0 && (
          <p className="muted" style={{ padding: '0.75rem 1rem 0', margin: 0, fontSize: '0.9rem' }}>
            Showing <strong>{candidates.length}</strong> candidate{candidates.length === 1 ? '' : 's'} — numbered{' '}
            <strong>1</strong> through <strong>{candidates.length}</strong>.
          </p>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', width: '3rem', textAlign: 'center' }}>#</th>
              <th style={{ padding: '0.75rem' }}>Name</th>
              <th style={{ padding: '0.75rem' }}>Phone</th>
              <th style={{ padding: '0.75rem' }}>Email</th>
              <th style={{ padding: '0.75rem' }}>Applications</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, index) => {
              const blocked = isBlocked(c);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontWeight: 800,
                      color: '#0a2540',
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>
                      {c.firstName} {c.lastName}
                    </strong>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{c.phone ?? '—'}</td>
                  <td style={{ padding: '0.75rem' }}>{c.email ?? '—'}</td>
                  <td style={{ padding: '0.75rem' }}>{c.stats.applicationsCount}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {blocked ? (
                      <span className="tag-pill" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        Blocked
                      </span>
                    ) : (
                      <span className="tag-pill" style={{ background: '#dcfce7', color: '#166534' }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {blocked ? (
                      <button
                        type="button"
                        className="btn-clear-filters"
                        disabled={blockMutation.isPending || c.accountStatus === 'suspended'}
                        title={
                          c.accountStatus === 'suspended'
                            ? 'Account suspended — use user management to restore'
                            : undefined
                        }
                        onClick={() => blockMutation.mutate({ userId: c.id, blocked: false })}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-auth-submit"
                        style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.9rem' }}
                        disabled={blockMutation.isPending}
                        onClick={() => blockMutation.mutate({ userId: c.id, blocked: true })}
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!candidatesQuery.isLoading && candidates.length === 0 && (
          <p className="muted" style={{ padding: '1rem' }}>No candidates match your search.</p>
        )}
      </div>
    </div>
  );
};
