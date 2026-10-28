import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicFileUrl } from '../api/files';
import { apiDownloadFile, apiOpenFile } from '../api/client';
import type { TalentDetail } from '../types/api';
import { hasNoExperienceFlag, websiteHref } from '../utils/candidateProfile';
import { useTalentPortal } from '../utils/talentPortal';

function talentLocation(profile: TalentDetail): string {
  return [profile.city, profile.region, profile.country].filter(Boolean).join(', ') || 'Ethiopia';
}

function formatYears(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `${shown} year${n === 1 ? '' : 's'}`;
}

function formatRange(start?: string | null, end?: string | null, current?: boolean): string {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (!start) return current ? 'Current' : '';
  if (current) return `${fmt(start)} – Present`;
  if (!end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function yearFromDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return String(date.getUTCFullYear());
}

  function initials(profile: TalentDetail): string {
    return `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase() || 'CV';
  }

  function formatAvailability(status?: string | null): string {
    if (!status) return 'Available for hire';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  export const CompanyCvDetailPage: React.FC = () => {
    const portal = useTalentPortal();
    const candidateId = portal.candidateId;

    const profileQuery = useQuery({
      queryKey: ['talent', 'detail', portal.isAdmin ? 'admin' : portal.companyId, candidateId],
      queryFn: () => portal.get(candidateId!),
      enabled: portal.canQuery && Boolean(candidateId),
    });

    if (!portal.canQuery || !candidateId) {
      return (
        <div className="jobs-list-container">
          <div className="card" style={{ maxWidth: 600, margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
            <h3>Profile Not Available</h3>
            <p className="muted">This candidate profile could not be loaded or accessed.</p>
            <Link to={portal.listPath} className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              ← Back to CV Search
            </Link>
          </div>
        </div>
      );
    }

    if (profileQuery.isLoading) {
      return (
        <div className="jobs-list-container">
          <div className="job-card-skeleton" style={{ minHeight: '380px' }} />
        </div>
      );
    }

    if (profileQuery.isError) {
      return (
          <div className="jobs-list-container">
            <div className="alert-box-error">
              <h3>Failed to load candidate dossier</h3>
              <p>{(profileQuery.error as Error).message}</p>
              <Link to={portal.listPath} className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
                ← Back to CV Search
              </Link>
            </div>
          </div>
          );
  }

          const profile = profileQuery.data;
          if (!profile) return null;

          const photo = profile.photoFileId ? publicFileUrl(profile.photoFileId) : null;
          const years = formatYears(profile.yearsExperience);
          const resume = profile.resume;
          const noExperience = hasNoExperienceFlag(profile);
          const profession = profile.currentTitle || profile.headline || 'Professional Candidate';
          const website = profile.websiteUrl?.trim();
          const location = talentLocation(profile);
          const availability = formatAvailability(profile.availabilityStatus);

  const openResume = async () => {
    if (!resume) return;
          await apiOpenFile(resume.fileId);
  };

  const downloadResume = async () => {
    if (!resume) return;
          await apiDownloadFile(resume.fileId, resume.originalFilename || `${profile.firstName}-${profile.lastName}-CV`);
  };

          return (
            <div className="cv-detail-page-container">
              {/* Breadcrumb Navigation */}
              <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span>/</span>
                <Link to={portal.listPath}>Candidate Search</Link>
                <span>/</span>
                <span className="current-crumb">
                  {profile.firstName} {profile.lastName}
                </span>
              </nav>

      {/* Executive Candidate Header Hero */}
                    <header className="cv-executive-header">
                      <div className="cv-exec-top-row">
                        <div className="cv-exec-avatar-box">
                          {photo ? (
                            <img className="cv-exec-photo" src={photo} alt="" />
                          ) : (
                            <div className="cv-exec-photo-fallback">{initials(profile)}</div>
                          )}
                          <span className="cv-status-dot-lg" title={availability} />
                        </div>

          <div className="cv-exec-info">
            <div className="cv-exec-name-row">
              <h1 className="cv-exec-name">
                {profile.firstName} {profile.lastName}
              </h1>
              <span className="verified-badge-pill" title="Verified Candidate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Verified Talent
              </span>
            </div>

            <p className="cv-exec-role">{profession}</p>

            <div className="cv-exec-meta-line">
              <span className="meta-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" strokeWidth="2" />
                </svg>
                {location}
              </span>
              {years && (
                <span className="meta-pill">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                  </svg>
                  {years} experience
                </span>
              )}
              <span className="meta-pill meta-pill-avail">
                🟢 {availability}
              </span>
              {profile.careerLevel && (
                <span className="meta-pill">
                  🎯 {profile.careerLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="cv-exec-actions-bar">
          {resume ? (
            <>
              <button type="button" className="btn-cv-download-main" onClick={() => void downloadResume()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Download CV</span>
              </button>
              <button type="button" className="btn-cv-open-sec" onClick={() => void openResume()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Preview CV</span>
              </button>
            </>
          ) : null}

          {profile.email && (
            <a href={`mailto:${profile.email}?subject=Job Opportunity Inquiry via Progress Manpower`} className="btn-cv-email">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                <polyline points="22,6 12,13 2,6" strokeWidth="2" />
              </svg>
              <span>Email Candidate</span>
            </a>
          )}

          <button type="button" className="btn-cv-print" onClick={() => window.print()} title="Print CV Dossier">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeWidth="2" />
              <rect x="6" y="14" width="12" height="7" strokeWidth="2" />
            </svg>
            <span>Print Dossier</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Responsive Layout */}
      <div className="cv-detail-layout">
        {/* Left Column: Dossier Content */}
        <div className="cv-main-column">
          {/* Professional Summary */}
          <section className="cv-card-section">
            <h2 className="cv-section-title">
              <span className="cv-section-icon">📋</span> Professional Summary
            </h2>
            {profile.summary?.trim() ? (
              <p className="cv-summary-prose">{profile.summary}</p>
            ) : (
              <p className="muted">This candidate has verified credentials on file without an extended summary.</p>
            )}
          </section>

          {/* Work Experience Timeline */}
          <section className="cv-card-section">
            <h2 className="cv-section-title">
              <span className="cv-section-icon">💼</span> Work Experience
            </h2>
            {profile.experiences.length > 0 ? (
              <div className="cv-timeline-wrapper">
                {profile.experiences.map((item) => (
                  <div key={item.id} className="cv-timeline-item">
                    <div className="cv-timeline-node" />
                    <div className="cv-timeline-content">
                      <div className="cv-timeline-heading-row">
                        <h3 className="cv-timeline-role">{item.jobTitle}</h3>
                        <span className="cv-timeline-date">
                          {formatRange(item.startDate, item.endDate, item.isCurrent)}
                        </span>
                      </div>

                      <div className="cv-timeline-sub-row">
                        <strong className="cv-timeline-company">{item.companyName}</strong>
                        {item.workingCity && <span className="cv-timeline-tag">📍 {item.workingCity}</span>}
                        {item.employmentType && (
                          <span className="cv-timeline-tag">{item.employmentType.replace('_', ' ')}</span>
                        )}
                        {item.salary && <span className="cv-timeline-tag">💰 {item.salary}</span>}
                      </div>

                      {item.description && <p className="cv-timeline-desc">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : noExperience ? (
              <p className="muted">Candidate indicated entry-level status without prior listed work experience.</p>
            ) : (
              <p className="muted">No work experience entries listed yet.</p>
            )}
          </section>

          {/* Education Timeline */}
          <section className="cv-card-section">
            <h2 className="cv-section-title">
              <span className="cv-section-icon">🎓</span> Academic Background & Education
            </h2>
            {profile.educations.length > 0 ? (
              <div className="cv-timeline-wrapper">
                {profile.educations.map((item) => (
                  <div key={item.id} className="cv-timeline-item">
                    <div className="cv-timeline-node" />
                    <div className="cv-timeline-content">
                      <div className="cv-timeline-heading-row">
                        <h3 className="cv-timeline-role">{item.institution}</h3>
                        <span className="cv-timeline-date">
                          {formatRange(item.startDate, item.endDate, item.isCurrent)}
                        </span>
                      </div>

                      <div className="cv-timeline-sub-row">
                        <strong className="cv-timeline-qualification">
                          {[item.qualification, item.fieldOfStudy].filter(Boolean).join(' in ')}
                        </strong>
                        {item.grade && <span className="cv-timeline-tag">Grade: {item.grade}</span>}
                      </div>

                      {item.description && <p className="cv-timeline-desc">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No education records added yet.</p>
            )}
          </section>

          {/* Certifications & Licenses */}
          {profile.certifications.length > 0 && (
            <section className="cv-card-section">
              <h2 className="cv-section-title">
                <span className="cv-section-icon">📜</span> Certifications & Accreditations
              </h2>
              <div className="cv-cert-grid">
                {profile.certifications.map((item) => (
                  <div key={item.id} className="cv-cert-card">
                    <h4 className="cv-cert-name">{item.name}</h4>
                    <p className="cv-cert-issuer">{item.issuer}</p>
                    <div className="cv-cert-meta">
                      {item.issuedDate && <span>Issued: {yearFromDate(item.issuedDate)}</span>}
                      {item.credentialId && <span>ID: {item.credentialId}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Contact, Skills, Languages */}
        <aside className="cv-sidebar-column">
          {/* Direct Contact Card */}
          <div className="cv-side-card">
            <h3 className="cv-side-title">Contact & Personal Details</h3>
            <div className="cv-contact-list">
              {profile.email && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">✉️</span>
                  <div>
                    <span className="cv-contact-label">Email Address</span>
                    <a href={`mailto:${profile.email}`} className="cv-contact-value">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}
              {profile.phone && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">📞</span>
                  <div>
                    <span className="cv-contact-label">Telephone</span>
                    <a href={`tel:${profile.phone}`} className="cv-contact-value">
                      {profile.phone}
                    </a>
                  </div>
                </div>
              )}
              {profile.address?.trim() && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">📍</span>
                  <div>
                    <span className="cv-contact-label">Address</span>
                    <span className="cv-contact-value">{profile.address.trim()}</span>
                  </div>
                </div>
              )}
              {website && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">🌐</span>
                  <div>
                    <span className="cv-contact-label">Portfolio / Web</span>
                    <a href={websiteHref(website)!} target="_blank" rel="noreferrer" className="cv-contact-value">
                      {website}
                    </a>
                  </div>
                </div>
              )}
              {profile.gender && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">👤</span>
                  <div>
                    <span className="cv-contact-label">Gender</span>
                    <span className="cv-contact-value">{profile.gender}</span>
                  </div>
                </div>
              )}
              {profile.managerialExperience && (
                <div className="cv-contact-row">
                  <span className="cv-contact-icon">👔</span>
                  <div>
                    <span className="cv-contact-label">Managerial Experience</span>
                    <span className="cv-contact-value">{profile.managerialExperience}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills & Competencies */}
          <div className="cv-side-card">
            <h3 className="cv-side-title">Skills & Competencies</h3>
            {profile.skills.length > 0 ? (
              <div className="cv-skills-chips">
                {profile.skills.map((link) => (
                  <span key={`${link.candidateId}-${link.skillId}`} className="cv-skill-badge">
                    {link.skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No skills listed yet.</p>
            )}
          </div>

          {/* Languages */}
          <div className="cv-side-card">
            <h3 className="cv-side-title">Languages</h3>
            {profile.languages.length > 0 ? (
              <div className="cv-languages-list">
                {profile.languages.map((lang) => (
                  <div key={lang.id} className="cv-lang-item">
                    <div className="cv-lang-header">
                      <strong>{lang.name}</strong>
                      {lang.proficiency && <span className="cv-lang-pill">{lang.proficiency}</span>}
                    </div>
                    <div className="cv-lang-breakdown">
                      {lang.listening && <span>Listening: {lang.listening}</span>}
                      {lang.reading && <span>Reading: {lang.reading}</span>}
                      {lang.writing && <span>Writing: {lang.writing}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No languages listed yet.</p>
            )}
          </div>

          {/* Resume Attachment Card */}
          {resume && (
            <div className="cv-side-card cv-resume-attachment-card">
              <h3 className="cv-side-title">Attached Resume</h3>
              <div className="cv-resume-preview-box">
                <div className="cv-file-icon">📄</div>
                <div className="cv-file-meta">
                  <strong>{resume.title || 'Candidate Resume'}</strong>
                  <span className="muted">{resume.originalFilename}</span>
                </div>
              </div>
              <div className="cv-resume-side-actions">
                <button type="button" className="btn btn-sm" onClick={() => void downloadResume()}>
                  Download PDF
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => void openResume()}>
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* Recruitment Advisory Card */}
          <div className="cv-side-card cv-support-card">
            <span className="support-badge">Direct Recruiter Support</span>
            <p>Ready to interview or hire this candidate? Progress Manpower Dukem HQ coordinates candidate screenings, interviews, and compliance.</p>
            <div className="support-phone">+251 949 811 818</div>
            <div className="support-email">progressjobs8@gmail.com</div>
          </div>
        </aside>
      </div>
    </div>
  );
};
