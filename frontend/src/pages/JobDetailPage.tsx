import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { candidateApi } from '../api/candidate';
import { supportApi } from '../api/support';
import { useAuth } from '../auth/AuthContext';
import { JobProse, textHasHeadings } from '../components/JobProse';
import { PROGRESS_HIRE_EMAIL } from '../constants/progressContact';
import { applyViaParts, extractEmail } from '../utils/hireContact';
import type { Job } from '../types/api';

function compensationLabel(job: Job): string {
  if (job.salaryVisibility && (job.salaryMin || job.salaryMax)) {
    const min = job.salaryMin != null ? Number(job.salaryMin).toLocaleString() : '';
    const max = job.salaryMax != null ? Number(job.salaryMax).toLocaleString() : '';
    const range = min && max ? `${min} – ${max}` : min || max;
    return `${job.salaryCurrency ?? 'ETB'} ${range}`;
  }
  return 'Negotiable';
}

function hireContact(job: Job): { viaProgress: boolean; email?: string; instructions?: string; url?: string } {
  if (job.applicationMethod === 'external_url' && job.applicationUrl?.trim()) {
    return { viaProgress: false, url: job.applicationUrl.trim() };
  }
  const viaProgress = job.applicationMethod === 'admin' || job.applicationMethod === 'internal';
  const instructions = job.applicationInstructions?.trim() || undefined;
  const email =
    job.applicationEmail?.trim() ||
    extractEmail(instructions) ||
    (viaProgress ? PROGRESS_HIRE_EMAIL : undefined);
  return { viaProgress, email, instructions };
}

function yearsValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function experienceLabel(job: Job): string | null {
  const min = yearsValue(job.experienceMinYears);
  const max = yearsValue(job.experienceMaxYears);
  if (min == null && max == null) return null;
  if ((min ?? 0) === 0 && max == null) return 'Entry level';
  if (min != null && max != null) return `${min}–${max} Years`;
  if (min != null) return `${min}+ Years`;
  return `Up to ${max} Years`;
}

function postedLabel(iso?: string | null): string {
  if (!iso) return 'Recently posted';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently posted';
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

function deadlineMeta(iso: string): { label: string; urgent: boolean } {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return { label: iso, urgent: false };
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const date = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (days < 0) return { label: `${date} (closed)`, urgent: true };
  if (days === 0) return { label: `${date} (today)`, urgent: true };
  if (days === 1) return { label: `${date} (1 day left)`, urgent: true };
  return { label: `${date} (${days} days left)`, urgent: days <= 7 };
}

function prettyEnum(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function uniqueText(...values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    const key = text.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function applyTarget(
  job: Job,
  contact: ReturnType<typeof hireContact>,
): { href: string; external?: boolean } {
  if (contact.url) return { href: contact.url, external: true };
  const via = applyViaParts(contact);
  if (via.href?.startsWith('mailto:')) {
    return { href: `${via.href}?subject=${encodeURIComponent(job.title.trim())}` };
  }
  if (via.href) return { href: via.href, external: true };
  return { href: '#how-to-apply' };
}

const SAVED_KEY = 'progress_saved_jobs';

function readLocalSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocalSaved(ids: string[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

const REPORT_REASONS = [
  { id: 'misleading', label: 'Misleading or inaccurate' },
  { id: 'expired', label: 'Already closed / expired' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'offensive', label: 'Offensive content' },
  { id: 'other', label: 'Other' },
];

export const JobDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, hasRole, setWorkspace } = useAuth();
  const [saved, setSaved] = useState(() => false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('misleading');
  const [reportNote, setReportNote] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.detail(slug!, 'job_detail_page'),
    enabled: Boolean(slug),
  });

  const featuredQuery = useQuery({
    queryKey: ['jobs', 'detail-featured'],
    queryFn: () => jobsApi.list({ page: 1, limit: 8 }),
  });

  const job = jobQuery.data;

  useEffect(() => {
    if (!job) return;
    setSaved(readLocalSaved().includes(job.id));
  }, [job]);

  const contact = job ? hireContact(job) : null;
  const apply = job && contact ? applyTarget(job, contact) : null;
  const deadline = job ? deadlineMeta(job.applicationDeadline) : null;
  const experience = job ? experienceLabel(job) : null;
  const ownsJob = Boolean(
    job && user?.companyMemberships.some((membership) => membership.companyId === job.companyId),
  );

  const bodyTexts = useMemo(() => {
    if (!job) return { summary: '', main: '', requirements: '' };
    const summary = job.summary?.trim() ?? '';
    const main = uniqueText(job.responsibilities, job.description)
      .filter((text) => text !== summary)
      .join('\n\n');
    const requirements =
      uniqueText(job.requirements).find((text) => text !== summary && text !== main) ?? '';
    return { summary, main, requirements };
  }, [job]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const reportMutation = useMutation({
    mutationFn: () =>
      supportApi.reportJob({
        jobId: job!.id,
        reason: reportReason,
        description: reportNote.trim() || undefined,
      }),
    onSuccess: () => {
      setReportStatus('sent');
      setReportOpen(false);
      setReportNote('');
    },
    onError: () => setReportStatus('error'),
  });

  const saveMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!job) return next;
      if (user && hasRole('candidate')) {
        try {
          if (next) await candidateApi.saveJob(job.id);
          else await candidateApi.unsaveJob(job.id);
        } catch {
          /* local bookmark still works if the candidate profile is missing */
        }
      }
      const ids = new Set(readLocalSaved());
      if (next) ids.add(job.id);
      else ids.delete(job.id);
      writeLocalSaved([...ids]);
      return next;
    },
    onSuccess: (next) => setSaved(next),
  });

  const toggleSave = () => {
    saveMutation.mutate(!saved);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (jobQuery.isLoading) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="job-card-skeleton" style={{ minHeight: '320px' }} />
        </div>
      </div>
    );
  }

  if (jobQuery.isError || !job || !contact || !apply || !deadline) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="alert-box-error">
            <h2>Job Opportunity Not Found</h2>
            <p>{(jobQuery.error as Error)?.message || 'This position may have closed or expired.'}</p>
            <Link to="/jobs" className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              Back to Active Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const title = job.title.trim();
  const applyVia = applyViaParts(contact);
  const featuredJobs = (featuredQuery.data?.data ?? []).filter((item) => item.id !== job.id).slice(0, 4);
  const mainHasHeadings = textHasHeadings(bodyTexts.main);

  return (
    <div className="job-detail-page">
      <div className="job-detail-container">
        <Link to="/jobs" className="jd-back">
          ← Back to all opportunities
        </Link>

        <header className="jd-header">
          <div>
            <p className="jd-kicker">
              {job.company ? job.company.name : 'Progress Verified Employer'}
              {job.company?.verificationStatus === 'verified' && <span className="jd-kicker-tag">Verified</span>}
            </p>
            <h1 className="jd-title">{title}</h1>
            <div className="jd-meta-line">
              {job.location && (
                <span>
                  <MetaPin /> {job.location.name}
                </span>
              )}
              <span>
                <MetaClock /> {prettyEnum(job.employmentType)}
              </span>
              <span>
                <MetaBuilding /> {prettyEnum(job.workplaceType)}
              </span>
              {job.category && <span>{job.category.name}</span>}
            </div>
          </div>
          <a
            className="jd-apply"
            href={apply.href}
            {...(apply.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            Apply for this job
            <span aria-hidden="true">→</span>
          </a>
        </header>

        <div className="jd-pills">
          <span className="jd-pill">
            <MetaCal /> {postedLabel(job.postedAt ?? job.createdAt)}
          </span>
          {experience && (
            <span className="jd-pill">
              <MetaBriefcase /> {experience}
            </span>
          )}
          <span className="jd-pill jd-pill-salary">
            <MetaPay /> {compensationLabel(job)}
          </span>
          <span className={`jd-pill ${deadline.urgent ? 'jd-pill-deadline' : ''}`}>
            <MetaCal /> Deadline {deadline.label}
          </span>
        </div>

        <div className="jd-layout">
          <article className="jd-card">
            {bodyTexts.summary && (
              <section>
                <h2 className="jd-heading">Job Summary</h2>
                <JobProse text={bodyTexts.summary} />
              </section>
            )}

            {bodyTexts.main && (
              <section>
                {!mainHasHeadings && <h2 className="jd-heading">Job Responsibilities</h2>}
                <JobProse text={bodyTexts.main} preferList={!mainHasHeadings} />
              </section>
            )}

            {bodyTexts.requirements && (
              <section>
                <h2 className="jd-heading">Qualifications</h2>
                <JobProse text={bodyTexts.requirements} preferList />
              </section>
            )}

            {experience && (
              <section>
                <h2 className="jd-heading">Experience</h2>
                <ul className="jd-plain-list">
                  <li>
                    {experience === 'Entry level'
                      ? 'No prior experience required (entry level)'
                      : `${experience} of relevant work experience`}
                  </li>
                </ul>
              </section>
            )}

            {job.educationRequirement &&
              !['non', 'none', 'n/a', 'na', 'nil', '-'].includes(job.educationRequirement.trim().toLowerCase()) && (
              <section>
                <h2 className="jd-heading">Education</h2>
                <ul className="jd-plain-list">
                  <li>{job.educationRequirement}</li>
                </ul>
              </section>
            )}

            {job.skills && job.skills.length > 0 && (
              <section>
                <h2 className="jd-heading">Required Skills and Competencies</h2>
                <ul className="jd-plain-list">
                  {job.skills.map((item) => (
                    <li key={item.id}>
                      {item.skill.name}
                      {item.isRequired ? ' (required)' : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {job.vacanciesCount > 1 && (
              <section>
                <h2 className="jd-heading">Open positions</h2>
                <ul className="jd-plain-list">
                  <li>{job.vacanciesCount} vacancies</li>
                </ul>
              </section>
            )}

            {job.screeningQuestions && job.screeningQuestions.length > 0 && (
              <p className="jd-note">
                This employer asks {job.screeningQuestions.length} screening question
                {job.screeningQuestions.length === 1 ? '' : 's'} when you apply.
              </p>
            )}
          </article>

          <aside className="jd-side">
            {ownsJob ? (
              <div className="role-note-card">
                You posted this job. Switch to hiring in the nav to edit it.
                {hasRole('employer') && (
                  <button
                    type="button"
                    className="jd-apply jd-apply-block"
                    style={{ marginTop: '0.85rem', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setWorkspace('employer');
                      navigate(`/company/${job.companyId}/jobs/${job.id}/edit`);
                    }}
                  >
                    Switch to hiring and edit
                  </button>
                )}
              </div>
            ) : (
              <a
                className="jd-apply jd-apply-block"
                href={apply.href}
                {...(apply.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                Apply for this job
                <span aria-hidden="true">→</span>
              </a>
            )}

            <p className="jd-side-label">Quick actions</p>
            <div className="jd-actions">
              <button type="button" className={saved ? 'is-on' : ''} onClick={toggleSave}>
                <ActionSave filled={saved} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button type="button" onClick={() => window.print()}>
                <ActionPrint />
                Print
              </button>
              <button type="button" onClick={() => setReportOpen((open) => !open)}>
                <ActionFlag />
                Report
              </button>
            </div>

            {reportOpen && (
              <form
                className="jd-report"
                onSubmit={(event) => {
                  event.preventDefault();
                  reportMutation.mutate();
                }}
              >
                <label htmlFor="jd-report-reason">Why are you reporting this job?</label>
                <select
                  id="jd-report-reason"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  placeholder="Optional details"
                  value={reportNote}
                  onChange={(event) => setReportNote(event.target.value)}
                />
                <button type="submit" disabled={reportMutation.isPending}>
                  {reportMutation.isPending ? 'Sending…' : 'Submit report'}
                </button>
              </form>
            )}
            {reportStatus === 'sent' && <p className="jd-side-msg">Thanks — we received your report.</p>}
            {reportStatus === 'error' && <p className="jd-side-msg is-error">Could not send the report. Try again.</p>}

            <p className="jd-side-label">Share vacancy</p>
            <div className="jd-share">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Telegram"
              >
                Tg
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on LinkedIn"
              >
                in
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Facebook"
              >
                f
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on X"
              >
                𝕏
              </a>
              <button type="button" onClick={copyLink} aria-label="Copy link">
                {copied ? '✓' : '↗'}
              </button>
            </div>
          </aside>
        </div>

        <section id="how-to-apply" className="jd-how">
          <h2>How to apply</h2>
          <p className="jd-how-copy">
            Qualified applicants who meet the specified criteria are invited to forward their updated
            CV to
          </p>
          {applyVia.via ? (
            <p className="jd-how-contact">
              {applyVia.href ? (
                <a
                  className="jd-how-email"
                  href={
                    applyVia.href.startsWith('mailto:')
                      ? `${applyVia.href}?subject=${encodeURIComponent(title)}`
                      : applyVia.href
                  }
                  {...(applyVia.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {applyVia.via}
                </a>
              ) : (
                applyVia.via
              )}
              {applyVia.extra ? ` — ${applyVia.extra}` : ''}
            </p>
          ) : (
            <p className="jd-how-contact">Contact details were not provided for this posting.</p>
          )}
          {applyVia.href?.startsWith('mailto:') && (
            <p className="jd-how-subject">
              Email subject line: <strong>“{title}”</strong>
            </p>
          )}
        </section>

        {featuredJobs.length > 0 && (
          <section className="jd-featured">
            <div className="jd-featured-head">
              <h2>Featured Jobs</h2>
              <Link to="/jobs">View all →</Link>
            </div>
            <div className="jd-featured-grid">
              {featuredJobs.map((item) => (
                <article key={item.id} className="jd-mini-card">
                  <div className="jd-mini-top">
                    <div className="jd-mini-logo">
                      {item.company?.name ? item.company.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <span className="jd-mini-type">{prettyEnum(item.employmentType)}</span>
                  </div>
                  {item.category && <p className="jd-mini-cat">{item.category.name}</p>}
                  <h3>
                    <Link to={`/jobs/${item.slug}`}>{item.title}</Link>
                  </h3>
                  {item.location && <p className="jd-mini-loc">{item.location.name}</p>}
                  <Link to={`/jobs/${item.slug}`} className="jd-mini-btn">
                    View details →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

function MetaPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" strokeWidth="2" />
    </svg>
  );
}
function MetaClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path d="M12 7v6l4 2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MetaBuilding() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M4 21V7l8-4 8 4v14" strokeWidth="2" />
      <path d="M9 21v-6h6v6" strokeWidth="2" />
    </svg>
  );
}
function MetaCal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MetaBriefcase() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" />
    </svg>
  );
}
function MetaPay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" strokeWidth="2" />
    </svg>
  );
}
function ActionSave({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeWidth="2" />
    </svg>
  );
}
function ActionPrint() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeWidth="2" />
      <rect x="6" y="14" width="12" height="7" strokeWidth="2" />
    </svg>
  );
}
function ActionFlag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M5 21V4h11l-1.5 4L16 12H5" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
