import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { apiDownloadFile } from '../api/client';

export const CandidateResumesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resumesQuery = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: () => candidateApi.listResumes(),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Please choose a PDF, DOC, or DOCX file.');
      return candidateApi.uploadResume(selectedFile, title.trim() || selectedFile.name);
    },
    onSuccess: () => {
      setTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => candidateApi.setDefaultResume(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => candidateApi.deleteResume(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    uploadMutation.mutate();
  };

  const resumes = resumesQuery.data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>My CVs / Resumes</h1>
        <p className="muted">
          Upload PDF, DOC, or DOCX files (max 5 MB). Your default CV can be selected when applying.
        </p>
      </div>

      <div className="card">
        <h3>Upload New CV</h3>
        {actionError && <div className="alert-error">{actionError}</div>}

        <form onSubmit={handleUpload} className="stack">
          <div className="grid-two">
            <div className="field">
              <label htmlFor="cv-title">Resume Title *</label>
              <input
                id="cv-title"
                type="text"
                required
                placeholder="e.g. Backend Engineer CV 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="cv-file">File (PDF, DOC, DOCX) *</label>
              <input
                ref={fileInputRef}
                id="cv-file"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div>
            <button type="submit" className="btn" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload CV'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Uploaded Resumes ({resumes.length})</h3>
        {resumesQuery.isLoading && <p>Loading resumes...</p>}
        {!resumesQuery.isLoading && resumes.length === 0 && (
          <p className="muted">No CVs uploaded yet.</p>
        )}

        {resumes.length > 0 && (
          <div className="table-scroll">
            <table className="table stacked-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>File</th>
                  <th>Default</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Title">
                      <strong>{r.title}</strong>
                    </td>
                    <td data-label="File">{r.file?.originalName ?? r.fileId}</td>
                    <td data-label="Default">
                      {r.isDefault ? (
                        <span className="badge badge-success">Default</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={defaultMutation.isPending}
                          onClick={() => defaultMutation.mutate(r.id)}
                        >
                          Set Default
                        </button>
                      )}
                    </td>
                    <td data-label="Uploaded">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="row-actions" data-label="Actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() =>
                          apiDownloadFile(r.fileId, r.file?.originalName || `${r.title}.pdf`).catch(
                            (e: Error) => setActionError(e.message),
                          )
                        }
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        Delete
                      </button>
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
