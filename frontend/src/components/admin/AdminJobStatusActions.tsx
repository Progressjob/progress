import React from 'react';
import type { Job } from '../../types/api';

interface AdminJobStatusActionsProps {
  job: Job;
  busy?: boolean;
  onPublish: (id: string) => void;
  onReopen?: (id: string) => void;
  onReject: (id: string) => void;
  onClose: (id: string) => void;
  onArchive: (id: string) => void;
}

export const AdminJobStatusActions: React.FC<AdminJobStatusActionsProps> = ({
  job,
  busy,
  onPublish,
  onReopen,
  onReject,
  onClose,
  onArchive,
}) => {
  return (
    <>
      {(job.status === 'pending_review' || job.status === 'draft') && (
        <button
          type="button"
          className="admin-jobs-action is-primary"
          disabled={busy}
          onClick={() => onPublish(job.id)}
        >
          Publish
        </button>
      )}
      {job.status === 'closed' && (
        <button
          type="button"
          className="admin-jobs-action is-primary"
          disabled={busy}
          onClick={() => (onReopen ?? onPublish)(job.id)}
        >
          Reopen
        </button>
      )}
      {job.status === 'pending_review' && (
        <button
          type="button"
          className="admin-jobs-action"
          disabled={busy}
          onClick={() => onReject(job.id)}
        >
          Reject
        </button>
      )}
      {job.status === 'published' && (
        <button
          type="button"
          className="admin-jobs-action"
          disabled={busy}
          onClick={() => onClose(job.id)}
        >
          Close
        </button>
      )}
      {(job.status === 'closed' || job.status === 'rejected') && (
        <button
          type="button"
          className="admin-jobs-action"
          disabled={busy}
          onClick={() => onArchive(job.id)}
        >
          Archive
        </button>
      )}
    </>
  );
};
