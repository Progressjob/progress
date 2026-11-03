import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { BackButton } from '../components/BackButton';
import { prettyJobEnum } from '../components/admin/adminJobUi';
import type { JobReport, SupportPerson } from '../types/api';
import { personName, reportDateLabel } from '../utils/adminSupport';

const STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];

function ContactCard({
  label,
  name,
  extra,
  email,
  phone,
  empty,
}: {
  label: string;
  name?: string;
  extra?: string | null;
  email?: string | null;
  phone?: string | null;
  empty?: string;
}) {
  const hasAny = Boolean(name || extra || email || phone);
  return (
    <section className="sr-panel">
      <h2>{label}</h2>
      {hasAny ? (
        <div className="sr-contact">
          {name && <strong>{name}</strong>}
          {extra && <span>{extra}</span>}
          {email && <a href={`mailto:${encodeURIComponent(email)}`}>{email}</a>}
          {phone && <a href={`tel:${phone}`}>{phone}</a>}
        </div>
      ) : (
        <p>{empty ?? 'Not provided'}</p>
      )}
    </section>
  );
}

function personCard(person: SupportPerson | null | undefined) {
  return {
    name: personName(person) || undefined,
    email: person?.email,
    phone: person?.phone,
  };
}

export function AdminReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'support', 'reports', reportId],
    queryFn: () => apiFetch<JobReport>(`/admin/reports/${reportId}`),
    enabled: Boolean(reportId),
  });
  const mutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/reports/${reportId}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  if (query.isLoading) {
    return (
      <div className="admin-screen">
        <BackButton fallback="/admin/support?tab=reports" />
        <p>Loading report…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="admin-screen">
        <BackButton fallback="/admin/support?tab=reports" />
        <div className="admin-empty">That report was not found.</div>
      </div>
    );
  }

  const report = query.data;
  const company = report.job.company;
  const poster = personCard(report.job.creator);
  const reporter = personCard(report.reporter);
  const reason = prettyJobEnum(report.reason);

  return (
    <div className="admin-screen sr-detail">
      <BackButton fallback="/admin/support?tab=reports" />
      <header className="sr-detail-hero">
        <span className="section-eyebrow">Job report</span>
        <div className="sr-detail-title-row">
          <h1>{report.job.title}</h1>
          <span className="status-badge">{report.status.replaceAll('_', ' ')}</span>
        </div>
        <p>
          {company.name} · {prettyJobEnum(report.job.employmentType)} · Reported{' '}
          {reportDateLabel(report.createdAt)}
        </p>
      </header>

      {(query.isError || mutation.isError) && (
        <p className="alert-box-error" role="alert">
          {(query.error || mutation.error)?.message}
        </p>
      )}

      <div className="sr-detail-grid">
        <section className="sr-panel sr-panel-wide">
          <h2>Why it was reported</h2>
          <p className="sr-reason">{reason}</p>
          {report.description ? (
            <p className="support-message-body">{report.description}</p>
          ) : (
            <p>No extra details were provided.</p>
          )}
        </section>
        <ContactCard
          label="Company"
          name={company.name}
          extra={company.contactPerson}
          email={company.email}
          phone={company.phone}
        />
        <ContactCard label="Employer / poster" {...poster} />
        <ContactCard
          label="Reported by"
          {...reporter}
          empty="Contact was not recorded for this report."
        />
      </div>

      <div className="sr-detail-actions">
        <label>
          Case status
          <select
            aria-label={`Status for ${report.job.title}`}
            value={report.status}
            disabled={mutation.isPending}
            onChange={(e) => mutation.mutate(e.target.value)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <Link to={`/admin/jobs/${report.job.id}`} className="btn-nav-register">
          Open job posting
        </Link>
        {report.reporter?.email && (
          <a
            className="sr-mail-btn"
            href={`mailto:${encodeURIComponent(report.reporter.email)}?subject=${encodeURIComponent(`Re: report on ${report.job.title}`)}`}
          >
            Contact reporter
          </a>
        )}
      </div>
    </div>
  );
}
