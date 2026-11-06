import { BackButton } from '../BackButton';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../api/candidate';
import { supportApi } from '../../api/support';
import { CompanyLogoMark } from '../CompanyLogoMark';
import { useAuth } from '../../auth/AuthContext';
import { JobProse, textHasHeadings } from '../JobProse';
import { PROGRESS_HIRE_EMAIL } from '../../constants/progressContact';
import { applyViaParts, extractEmail } from '../../utils/hireContact';
import { profileStrength } from '../../utils/candidateProfile';
import type { Job } from '../../types/api';

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
  if ((min ?? 0) === 0 && max == null) return 'Entry level (0 yrs)';
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
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

function deadlineMeta(iso: string): { label: string; urgent: boolean; diffDays: number } {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return { label: iso, urgent: false, diffDays: 99 };
  const diffDays = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const date = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (diffDays < 0) return { label: `${date} (Closed)`, urgent: true, diffDays };
  if (diffDays === 0) return { label: `${date} (Closing Today)`, urgent: true, diffDays };
  if (diffDays === 1) return { label: `${date} (1 day left)`, urgent: true, diffDays };
  return { label: `${date} (${diffDays} days left)`, urgent: diffDays <= 7, diffDays };
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

export const JobDetailContent: React.FC<{
  job: Job;
  featuredJobs?: Job[];
  backFallback?: string;
  previewNote?: string | null;
}> = ({ job, featuredJobs = [], backFallback = '/jobs', previewNote = null }) => {
  const navigate = useNavigate();
  const { user, hasRole, setWorkspace } = useAuth();
  const [saved, setSaved] = useState(() => false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('misleading');
  const [reportNote, setReportNote] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [applyTipOpen, setApplyTipOpen] = useState(false);

  const applicationsBlocked = Boolean(user?.applicationsBlocked);

  const candidateProfileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
    enabled: Boolean(user && hasRole('candidate') && !applicationsBlocked),
  });

  useEffect(() => {
    setSaved(readLocalSaved().includes(job.id));
  }, [job.id]);

  const contact = hireContact(job);
  const apply = applyTarget(job, contact);
  const deadline = deadlineMeta(job.applicationDeadline);
  const experience = experienceLabel(job);
  const ownsJob = Boolean(
    job && user?.companyMemberships.some((membership) => membership.companyId === job.companyId),
  );

  const bodyTexts = useMemo(() => {
    const summary = job.summary?.trim() ?? '';
    const main = uniqueText(job.responsibilities, job.description)
      .filter((text) => text !== summary)
      .join('\n\n');
    const requirements =
      uniqueText(job.requirements).find((text) => text !== summary && text !== main) ?? '';
    return { summary, main, requirements };
  }, [job]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/jobs/${job.slug}`
      : `/jobs/${job.slug}`;

  const reportMutation = useMutation({
    mutationFn: () =>
      supportApi.reportJob({
        jobId: job.id,
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
      if (user && hasRole('candidate')) {
        try {
          if (next) await candidateApi.saveJob(job.id);
          else await candidateApi.unsaveJob(job.id);
        } catch {
          /* local bookmark still works if profile is missing */
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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const title = job.title.trim();
  const applyVia = applyViaParts(contact);
  const candidateProfile = candidateProfileQuery.data;
  const thinProfile = candidateProfile ? profileStrength(candidateProfile) < 50 : false;
  const similarJobs = featuredJobs.filter((item) => item.id !== job.id).slice(0, 4);
  const mainHasHeadings = textHasHeadings(bodyTexts.main);
  const logoId = job.company?.logo?.id ?? job.company?.logoFileId ?? null;

  const proceedApply = () => {
    setApplyTipOpen(false);
    if (apply.href.startsWith('#')) {
      document.querySelector(apply.href)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (apply.external) {
      window.open(apply.href, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = apply.href;
  };

  const onApplyClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!thinProfile) return;
    event.preventDefault();
    setApplyTipOpen(true);
  };

  return (
    <div className="job-detail-page">
      <div className="job-detail-container">
        <BackButton fallback={backFallback} />

        {previewNote ? <div className="employer-jobs-banner">{previewNote}</div> : null}

        <header className="jd-header-hero">
          <div className="jd-header-top">
            <div className="jd-company-avatar">
              <CompanyLogoMark
                name={job.company?.name}
                logoId={logoId}
                className="jd-company-monogram"
                imgClassName="jd-company-logo-img"
              />
            </div>

            <div className="jd-header-info">
              <div className="jd-kicker-row">
                {job.company ? (
                  <>
                    <span className="jd-company-title jd-company-title-static">
                      {job.company.name}
                    </span>
                    <Link
                      to={`/companies/${job.company.slug}`}
                      className="jd-company-title jd-company-title-link"
                    >
                      {job.company.name}
                    </Link>
                  </>
                ) : (
                  <span className="jd-company-title">Progress Verified Employer</span>
                )}
                {job.company?.verificationStatus === 'verified' && (
                  <span className="verified-badge-pill">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Verified Partner
                  </span>
                )}
                <span className="jd-posted-badge">• Posted {postedLabel(job.postedAt ?? job.createdAt)}</span>
              </div>

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
                {job.category && <span className="jd-cat-pill">{job.category.name}</span>}
              </div>
            </div>
          </div>

          <div className="jd-header-actions">
            {ownsJob ? (
              <div className="role-note-card">
                <span>You posted this job.</span>
                {hasRole('employer') && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setWorkspace('employer');
                      navigate(`/company/${job.companyId}/jobs/${job.id}/edit`);
                    }}
                  >
                    Edit position
                  </button>
                )}
              </div>
            ) : (
              <div className="jd-cta-group">
                <a
                  className="btn-jd-apply-main"
                  href={apply.href}
                  onClick={onApplyClick}
                  {...(apply.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <span>Apply Now</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </a>
                <button
                  type="button"
                  className={`btn-jd-save ${saved ? 'is-saved' : ''}`}
                  onClick={toggleSave}
                  title={saved ? 'Remove from saved' : 'Save this job'}
                >
                  <ActionSave filled={saved} />
                  <span>{saved ? 'Saved' : 'Save Job'}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="jd-quick-bar">
          <div className="jd-quick-item">
            <span className="jd-quick-label">
              <span className="jd-ql-full">Salary / Compensation</span>
              <span className="jd-ql-short">Salary</span>
            </span>
            <strong className="jd-quick-value text-primary">{compensationLabel(job)}</strong>
          </div>
          <div className="jd-quick-item">
            <span className="jd-quick-label">
              <span className="jd-ql-full">Experience</span>
              <span className="jd-ql-short">Experience</span>
            </span>
            <strong className="jd-quick-value">{experience || 'Not specified'}</strong>
          </div>
          <div className="jd-quick-item">
            <span className="jd-quick-label">
              <span className="jd-ql-full">Duty Station</span>
              <span className="jd-ql-short">Location</span>
            </span>
            <strong className="jd-quick-value">{job.location?.name || 'Ethiopia'}</strong>
          </div>
          <div className="jd-quick-item">
            <span className="jd-quick-label">
              <span className="jd-ql-full">Application Deadline</span>
              <span className="jd-ql-short">Deadline</span>
            </span>
            <strong className={`jd-quick-value ${deadline.urgent ? 'text-urgent' : ''}`}>
              <span className="jd-qd-full">{deadline.label}</span>
              <span className="jd-qd-short">
                {new Date(job.applicationDeadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
                {deadline.diffDays >= 0 ? ` · ${deadline.diffDays}d` : ' · closed'}
              </span>
            </strong>
          </div>
        </div>

        <div className="jd-layout">
          <article className="jd-card">
            {bodyTexts.summary && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">📋</span> Job Overview & Summary
                </h2>
                <JobProse text={bodyTexts.summary} />
              </section>
            )}

            {bodyTexts.main && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">💼</span> Key Duties & Responsibilities
                </h2>
                <JobProse text={bodyTexts.main} preferList={!mainHasHeadings} />
              </section>
            )}

            {bodyTexts.requirements && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">🎓</span> Qualifications & Requirements
                </h2>
                <JobProse text={bodyTexts.requirements} preferList />
              </section>
            )}

            {experience && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">⏱️</span> Required Work Experience
                </h2>
                <p className="jd-plain-text">
                  {experience === 'Entry level (0 yrs)'
                    ? 'No prior professional experience required. Suitable for fresh graduates.'
                    : `A minimum of ${experience} in a relevant professional role.`}
                </p>
              </section>
            )}

            {job.educationRequirement &&
              !['non', 'none', 'n/a', 'na', 'nil', '-'].includes(
                job.educationRequirement.trim().toLowerCase(),
              ) && (
                <section className="jd-section">
                  <h2 className="jd-heading">
                    <span className="jd-heading-icon">📜</span> Educational Level
                  </h2>
                  <p className="jd-plain-text">{job.educationRequirement}</p>
                </section>
              )}

            {job.skills && job.skills.length > 0 && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">⚡</span> Required Skills & Competencies
                </h2>
                <div className="jd-skills-badges">
                  {job.skills.map((item) => (
                    <span key={item.id} className="badge jd-skill-pill">
                      {item.skill.name}
                      {item.isRequired && <span className="required-star">*</span>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {job.vacanciesCount > 1 && (
              <section className="jd-section">
                <h2 className="jd-heading">
                  <span className="jd-heading-icon">👥</span> Open Positions
                </h2>
                <p className="jd-plain-text">
                  This employer is hiring <strong>{job.vacanciesCount}</strong> individuals for this
                  role.
                </p>
              </section>
            )}

            <section id="how-to-apply" className="jd-how-box">
              <div className="jd-how-header">
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  How to Apply
                </h3>
                <span className={`jd-how-deadline-pill ${deadline.urgent ? 'urgent' : ''}`}>
                  Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                </span>
              </div>

              <p className="jd-how-text">
                Interested and qualified applicants who meet the requirements are invited to submit
                their application, updated CV, and credentials:
              </p>

              {applyVia.via ? (
                <div className="jd-how-cta-box">
                  <span className="jd-how-channel-label">Direct Application Channel:</span>
                  {applyVia.href ? (
                    <a
                      className="jd-how-link-btn"
                      href={
                        applyVia.href.startsWith('mailto:')
                          ? `${applyVia.href}?subject=${encodeURIComponent(title)}`
                          : applyVia.href
                      }
                      {...(applyVia.href.startsWith('http')
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                    >
                      <span>{applyVia.via}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  ) : (
                    <strong
                      className="jd-how-via-text"
                      style={{ whiteSpace: 'pre-wrap', display: 'block' }}
                    >
                      {applyVia.via}
                    </strong>
                  )}
                  {applyVia.extra && (
                    <div
                      className="jd-how-extra"
                      style={{ whiteSpace: 'pre-wrap', marginTop: '0.75rem', lineHeight: 1.6 }}
                    >
                      {applyVia.extra}
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted">Direct contact channel handled via Progress Jobs HQ.</p>
              )}

              {applyVia.href?.startsWith('mailto:') && (
                <p className="jd-how-subject-note">
                  Please use <strong>“{title}”</strong> as the subject of your email.
                </p>
              )}
            </section>
          </article>

          <aside className="jd-side">
            <div className="jd-side-card jd-side-overview">
              <h3 className="jd-side-title">Job Overview</h3>
              <ul className="jd-overview-list">
                <li>
                  <span className="ov-icon">💰</span>
                  <div>
                    <span className="ov-label">Offered Salary</span>
                    <strong className="ov-value">{compensationLabel(job)}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">📍</span>
                  <div>
                    <span className="ov-label">Location / City</span>
                    <strong className="ov-value">{job.location?.name || 'Ethiopia'}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">💼</span>
                  <div>
                    <span className="ov-label">Job Type</span>
                    <strong className="ov-value">{prettyEnum(job.employmentType)}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">🏢</span>
                  <div>
                    <span className="ov-label">Workplace</span>
                    <strong className="ov-value">{prettyEnum(job.workplaceType)}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">⏱️</span>
                  <div>
                    <span className="ov-label">Experience</span>
                    <strong className="ov-value">{experience || 'Negotiable'}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">📅</span>
                  <div>
                    <span className="ov-label">Posted Date</span>
                    <strong className="ov-value">{postedLabel(job.postedAt ?? job.createdAt)}</strong>
                  </div>
                </li>
                <li>
                  <span className="ov-icon">⏳</span>
                  <div>
                    <span className="ov-label">Closing Date</span>
                    <strong className={`ov-value ${deadline.urgent ? 'text-urgent' : ''}`}>
                      {deadline.label}
                    </strong>
                  </div>
                </li>
              </ul>
            </div>

            <div className="jd-side-card jd-side-about">
              <h3 className="jd-side-title">About the Employer</h3>
              <div className="jd-company-preview">
                <strong>{job.company ? job.company.name : 'Progress Partner Employer'}</strong>
                {job.company?.industry?.name && (
                  <span className="jd-side-badge">{job.company.industry.name}</span>
                )}
                <p className="jd-company-desc">
                  {job.company?.description
                    ? `${job.company.description.slice(0, 160)}…`
                    : 'Verified enterprise partner recruiting through Progress Jobs.'}
                </p>
                {job.company && (
                  <Link to={`/companies/${job.company.slug}`} className="jd-view-company-link">
                    View Employer Profile →
                  </Link>
                )}
              </div>
            </div>

            <div className="jd-side-card jd-side-actions">
              <h3 className="jd-side-title">Quick Actions</h3>
              <div className="jd-actions-grid">
                <button type="button" className={saved ? 'is-on' : ''} onClick={toggleSave}>
                  <ActionSave filled={saved} />
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
                <button type="button" onClick={() => window.print()}>
                  <ActionPrint />
                  <span>Print</span>
                </button>
                <button type="button" onClick={() => setReportOpen((open) => !open)}>
                  <ActionFlag />
                  <span>Report</span>
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
                  <label htmlFor="jd-report-reason">Why are you reporting this vacancy?</label>
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
                    placeholder="Provide details..."
                    value={reportNote}
                    onChange={(event) => setReportNote(event.target.value)}
                  />
                  <button type="submit" disabled={reportMutation.isPending}>
                    {reportMutation.isPending ? 'Sending…' : 'Submit Report'}
                  </button>
                </form>
              )}
              {reportStatus === 'sent' && <p className="jd-side-msg">Report received. Thank you.</p>}
              {reportStatus === 'error' && (
                <p className="jd-side-msg is-error">Could not send report.</p>
              )}
            </div>

            <div className="jd-contact-share">
              <div className="jd-side-card jd-side-share">
                <h3 className="jd-side-title">Share Opportunity</h3>
                <h3 className="jd-side-title jd-side-title-mobile">Share</h3>
                <div className="jd-share-row">
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Telegram"
                    className="share-btn share-tg"
                    title="Share on Telegram"
                  >
                    <span className="share-ico" aria-hidden="true">Tg</span>
                    <span className="share-name">Telegram</span>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="share-btn share-li"
                    title="Share on LinkedIn"
                  >
                    <span className="share-ico" aria-hidden="true">in</span>
                    <span className="share-name">LinkedIn</span>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="share-btn share-fb"
                    title="Share on Facebook"
                  >
                    <span className="share-ico" aria-hidden="true">f</span>
                    <span className="share-name">Facebook</span>
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="share-btn share-copy"
                    title="Copy Link"
                  >
                    <span className="share-ico" aria-hidden="true">{copied ? '✓' : '🔗'}</span>
                    <span className="share-name">{copied ? 'Copied' : 'Copy link'}</span>
                  </button>
                </div>
              </div>

              <div className="jd-side-card jd-support-card">
                <span className="support-badge">Need Assistance?</span>
                <h3 className="jd-side-title jd-side-title-mobile">Support</h3>
                <p className="jd-support-desktop-copy">
                  Contact Progress Jobs Bishoftu headquarters:
                </p>
                <p className="jd-support-blurb">
                  Contact Progress Jobs HQ if you need help with this vacancy.
                </p>
                <div className="jd-support-links">
                  <a className="support-phone" href="tel:+251949811818">
                    +251 949 811 818
                  </a>
                  <a className="support-email" href="mailto:progressjobs8@gmail.com">
                    progressjobs8@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {similarJobs.length > 0 && (
          <section className="jd-featured">
            <div className="jd-featured-head">
              <h2>Similar Vacancies</h2>
              <Link to="/jobs">View all vacancies →</Link>
            </div>
            <div className="jd-featured-grid">
              {similarJobs.map((item) => (
                <article key={item.id} className="jd-mini-card">
                  <div className="jd-mini-top">
                    <div className="jd-mini-logo">
                      <CompanyLogoMark
                        name={item.company?.name}
                        logoId={item.company?.logo?.id ?? item.company?.logoFileId}
                        imgClassName="company-logo-img"
                      />
                    </div>
                    <span className="jd-mini-type">{prettyEnum(item.employmentType)}</span>
                  </div>
                  {item.category && <p className="jd-mini-cat">{item.category.name}</p>}
                  <h3>
                    <Link to={`/jobs/${item.slug}`}>{item.title}</Link>
                  </h3>
                  {item.location && <p className="jd-mini-loc">📍 {item.location.name}</p>}
                  <Link to={`/jobs/${item.slug}`} className="jd-mini-btn">
                    View details
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="jd-mobile-bar">
        <div className="jd-mobile-bar-info">
          <span className="jd-mobile-title">{title}</span>
          <span className="jd-mobile-company">
            {job.company ? job.company.name : 'Progress Employer'}
          </span>
        </div>
        <div className="jd-mobile-bar-actions">
          <button
            type="button"
            className={`btn-mobile-save ${saved ? 'is-saved' : ''}`}
            onClick={toggleSave}
            aria-label="Save Job"
          >
            <ActionSave filled={saved} />
          </button>
          <a
            className="btn-mobile-apply"
            href={apply.href}
            onClick={onApplyClick}
            {...(apply.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            Apply Now
          </a>
        </div>
      </div>

      {applyTipOpen && (
        <div
          className="jd-profile-tip-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jd-profile-tip-title"
          onClick={() => setApplyTipOpen(false)}
        >
          <div className="jd-profile-tip" onClick={(event) => event.stopPropagation()}>
            <h3 id="jd-profile-tip-title">Finish your profile first</h3>
            <p>
              Profiles with no CV or details have a lower chance of being hired. You can apply
              anyway, but completing your profile helps employers find you.
            </p>
            <div className="jd-profile-tip-actions">
              <Link to="/candidate/profile?edit=1" className="btn">
                Complete profile
              </Link>
              <button type="button" className="btn btn-secondary" onClick={proceedApply}>
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
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
function ActionSave({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeWidth="2" />
    </svg>
  );
}
function ActionPrint() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        strokeWidth="2"
      />
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
