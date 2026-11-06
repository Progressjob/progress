import { contactCategories, type ContactCategory } from '../api/support';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { CustomDropdown } from '../components/CustomDropdown';
import { prettyJobEnum } from '../components/admin/adminJobUi';
import type { JobReport } from '../types/api';
import { matchesReportSearch, reportDateLabel, reportedInRange } from '../utils/adminSupport';

interface Message {
  id: string;
  name: string;
  email: string;
  category?: ContactCategory | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

const REPORT_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];
const MESSAGE_STATUSES = ['new', 'in_progress', 'resolved'];
const JOB_TYPE_OPTIONS = [
  { value: '', label: 'All job types' },
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'casual_worker', label: 'Casual worker' },
];
const DATE_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export function AdminSupportPage() {
  const [params, setParams] = useSearchParams();
  const reports = params.get('tab') === 'reports';
  const selectedReportId = params.get('report');
  const selectedMessageId = params.get('message');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobType, setJobType] = useState('');
  const [when, setWhen] = useState('all');
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const messages = useQuery({
    queryKey: ['admin', 'support', 'messages'],
    queryFn: () => apiFetch<Message[]>('/admin/contact-messages'),
    refetchInterval: 30000,
  });
  const reportQuery = useQuery({
    queryKey: ['admin', 'support', 'reports'],
    queryFn: () => apiFetch<JobReport[]>('/admin/reports'),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/admin/${reports ? 'reports' : 'contact-messages'}/${id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });

  if (reports && selectedReportId) {
    return <Navigate to={`/admin/support/reports/${selectedReportId}`} replace />;
  }

  const term = search.toLowerCase();
  const messageRows = (messages.data ?? []).filter(
    (m) =>
      (statusFilter === 'all' || m.status === statusFilter) &&
      `${m.name} ${m.category ? contactCategories[m.category] : ''} ${m.subject} ${m.email} ${m.message}`.toLowerCase().includes(term),
  );
  const reportRows = (reportQuery.data ?? []).filter(
    (r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!jobType || r.job.employmentType === jobType) &&
      reportedInRange(r.createdAt, when) &&
      matchesReportSearch(r, search),
  );
  const statuses = reports ? REPORT_STATUSES : MESSAGE_STATUSES;
  const selectedMessage =
    !reports && selectedMessageId
      ? (messages.data ?? []).find((m) => m.id === selectedMessageId)
      : undefined;

  return (
    <div className="admin-screen support-screen">
      <header className="admin-screen-header">
        <div>
          <span className="section-eyebrow">Help desk</span>
          <h1>Support inbox</h1>
          <p>Manage contact-form enquiries and investigate reported vacancies.</p>
        </div>
      </header>
      <div className="admin-filter-bar">
        <button
          className={!reports ? 'selected' : ''}
          onClick={() => {
            setParams({});
            setStatusFilter('all');
            setJobType('');
            setWhen('all');
            setSearch('');
          }}
        >
          Messages ({messages.data?.filter((m) => m.status === 'new').length ?? 0} new)
        </button>
        <button
          className={reports ? 'selected' : ''}
          onClick={() => {
            setParams({ tab: 'reports' });
            setStatusFilter('all');
            setJobType('');
            setWhen('all');
            setSearch('');
          }}
        >
          Job reports
        </button>
      </div>

      {reports ? (
        <div className="sr-toolbar">
          <label className="sr-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or job title…"
              aria-label="Search company or job title"
            />
          </label>
          <div className="sr-filters">
            <CustomDropdown
              value={statusFilter === 'all' ? '' : statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              options={[
                { value: '', label: 'All statuses' },
                ...REPORT_STATUSES.map((s) => ({ value: s, label: prettyJobEnum(s) })),
              ]}
              placeholder="Status"
            />
            <CustomDropdown
              value={jobType}
              onChange={setJobType}
              options={JOB_TYPE_OPTIONS}
              placeholder="Job type"
            />
            <CustomDropdown
              value={when}
              onChange={setWhen}
              options={DATE_OPTIONS}
              placeholder="Reported"
            />
          </div>
        </div>
      ) : (
        <div className="admin-filter-bar">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {MESSAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <input
            aria-label="Search support inbox"
            placeholder="Search inbox…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {(messages.isError || reportQuery.isError || mutation.isError) && (
        <p className="alert-box-error" role="alert">
          {(messages.error || reportQuery.error || mutation.error)?.message}
        </p>
      )}
      {(reports ? reportQuery.isLoading : messages.isLoading) ? (
        <p>Loading inbox…</p>
      ) : reports ? (
        reportRows.length ? (
          <div className="sr-grid">
            {reportRows.map((report) => (
              <article key={report.id} className="sr-card">
                <div className="sr-card-top">
                  <span className="status-badge">{report.status.replaceAll('_', ' ')}</span>
                  <time dateTime={report.createdAt}>{reportDateLabel(report.createdAt)}</time>
                </div>
                <h2>{report.job.title}</h2>
                <p className="sr-card-company">{report.job.company.name}</p>
                <p className="sr-card-meta">{prettyJobEnum(report.job.employmentType)}</p>
                <Link to={`/admin/support/reports/${report.id}`} className="sr-card-go">
                  View details
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty">No reports match your search or filters.</div>
        )
      ) : selectedMessageId ? (
        selectedMessage ? (
          <div className="admin-inbox-list">
            <button type="button" className="admin-inbox-back" onClick={() => setParams({})}>
              ← All messages
            </button>
            <article className="admin-inbox-card">
              <div>
                <h2>{selectedMessage.subject}</h2>
                {selectedMessage.category && <span className="status-badge">{contactCategories[selectedMessage.category]}</span>}
                <small>
                  {selectedMessage.name} {selectedMessage.email && `· ${selectedMessage.email}`} ·{' '}
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </small>
                <p className="support-message-body">{selectedMessage.message}</p>
              </div>
              <div className="admin-row-actions">
                <select
                  aria-label={`Status for ${selectedMessage.subject}`}
                  value={selectedMessage.status}
                  disabled={mutation.isPending}
                  onChange={(e) => mutation.mutate({ id: selectedMessage.id, status: e.target.value })}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                {selectedMessage.email && (
                  <a
                    href={`mailto:${encodeURIComponent(selectedMessage.email)}?subject=${encodeURIComponent(`Re: ${selectedMessage.subject}`)}`}
                  >
                    Reply by email ↗
                  </a>
                )}
              </div>
            </article>
          </div>
        ) : (
          <div className="admin-empty">
            That message was not found.
            <div>
              <button type="button" onClick={() => setParams({})}>
                Back to messages
              </button>
            </div>
          </div>
        )
      ) : messageRows.length ? (
        <div className="admin-inbox-list">
          {messageRows.map((m) => (
            <button
              key={m.id}
              type="button"
              className="admin-inbox-card admin-inbox-row"
              onClick={() => setParams({ message: m.id })}
            >
              <span>
                <h2>{m.subject}</h2>
                <small>
                  {m.category && `${contactCategories[m.category]} · `}{m.name} {m.email && `· ${m.email}`} · {new Date(m.createdAt).toLocaleString()}
                </small>
              </span>
              <span className="status-badge">{m.status.replaceAll('_', ' ')}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="admin-empty">No items match your filters.</div>
      )}
    </div>
  );
}
