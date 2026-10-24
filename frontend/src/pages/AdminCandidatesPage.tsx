import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';

export const AdminCandidatesPage: React.FC = () => {
  const candidatesQuery = useQuery({
    queryKey: ['admin', 'candidates'],
    queryFn: () => adminApi.listCandidates(),
  });

  const candidates = candidatesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Registered candidates</h1>
        <p className="muted">{candidates.length} candidate account(s) on the platform.</p>
      </div>

      {candidatesQuery.isLoading && <div className="card">Loading candidates...</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Name</th>
              <th style={{ padding: '0.75rem' }}>Email</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Registered</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem' }}>
                  {u.firstName} {u.lastName}
                </td>
                <td style={{ padding: '0.75rem' }}>{u.email}</td>
                <td style={{ padding: '0.75rem' }}>{u.accountStatus}</td>
                <td style={{ padding: '0.75rem' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
