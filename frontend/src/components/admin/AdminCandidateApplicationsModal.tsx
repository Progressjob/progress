import React from 'react';
import { Link } from 'react-router-dom';
import type { AdminCandidateUser } from '../../types/api';

export interface AdminCandidateApplicationsModalProps {
  candidate: AdminCandidateUser;
  onClose: () => void;
}

export const AdminCandidateApplicationsModal: React.FC<AdminCandidateApplicationsModalProps> = ({
  candidate,
  onClose,
}) => {
  const apps = candidate.applications ?? [];
  const name = `${candidate.firstName} ${candidate.lastName}`.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-apps-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card stack"
        style={{ maxWidth: '720px', width: '100%', maxHeight: '85vh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h2 id="candidate-apps-modal-title" style={{ margin: 0 }}>
              Applications — {name}
            </h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Jobs this candidate applied to ({apps.length} total).
            </p>
          </div>
          <button type="button" className="btn-clear-filters" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        {apps.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No applications yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Job</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Company</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {app.job?.slug ? (
                        <Link to={`/jobs/${app.job.slug}`} target="_blank" rel="noopener noreferrer">
                          <strong>{app.job.title}</strong>
                        </Link>
                      ) : (
                        <strong>{app.job?.title ?? '—'}</strong>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{app.job?.company?.name ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span className="badge badge-info">{app.status}</span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(app.appliedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
