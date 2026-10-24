import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { publicFileUrl } from '../api/files';
import { useAuth } from '../auth/AuthContext';

function compensationLabel(job: {
  salaryVisibility?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}): string {
  if (job.salaryVisibility && (job.salaryMin || job.salaryMax)) {
    return `${job.salaryCurrency ?? 'ETB'} ${Number(job.salaryMin ?? 0).toLocaleString()} - ${Number(job.salaryMax ?? 0).toLocaleString()}`;
  }
  return 'Negotiable';
}

export const JobDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, hasRole } = useAuth();

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.detail(slug!, 'job_detail_page'),
    enabled: Boolean(slug),
  });

  if (jobQuery.isLoading) {
    return (
      <div className="job-detail-container">
        <div className="job-card-skeleton" style={{ minHeight: '300px' }} />
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="job-detail-container">
        <div className="alert-box-error">
          <h2>Job Opportunity Not Found</h2>
          <p>{(jobQuery.error as Error)?.message || 'This position may have closed or expired.'}</p>
          <Link to="/jobs" className="btn-nav-register" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            Back to Active Jobs
          </Link>
        </div>
      </div>
    );
  }

  const job = jobQuery.data;
  const logoId = job.company?.logo?.id;

  return (
    <div className="job-detail-container">
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/jobs">← Back to Vacancies</Link>
        <span>/</span>
        <span className="current-crumb">{job.title}</span>
      </nav>

      <div className="job-hero-card">
        <div className="job-hero-top">
          <div className="company-badge-large">
            {logoId ? (
              <img
                src={publicFileUrl(logoId)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
              />
            ) : (
              (job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P')
            )}
          </div>
          <div className="job-hero-info">
            <span className="job-company-pill">
              {job.company ? (
                <Link to={`/companies/${job.company.slug}`}>{job.company.name}</Link>
              ) : (
                'Progress Verified Employer'
              )}
            </span>
            <h1 className="job-detail-title">{job.title}</h1>
            <div className="job-meta-row">
              {job.location && (
                <span className="meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                    <circle cx="12" cy="10" r="3" strokeWidth="2" />
                  </svg>
                  {job.location.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="job-highlights-strip">
          <div className="highlight-pill-box">
            <span className="highlight-label">Employment Type</span>
            <strong className="highlight-value">{job.employmentType.replace('_', ' ').toUpperCase()}</strong>
          </div>
          <div className="highlight-pill-box">
            <span className="highlight-label">Workplace Model</span>
            <strong className="highlight-value">{job.workplaceType.replace('_', ' ').toUpperCase()}</strong>
          </div>
          <div className="highlight-pill-box">
            <span className="highlight-label">Compensation</span>
            <strong className="highlight-value">{compensationLabel(job)}</strong>
          </div>
          {job.experienceMinYears != null && Number(job.experienceMinYears) > 0 && (
            <div className="highlight-pill-box">
              <span className="highlight-label">Work Experience</span>
              <strong className="highlight-value">
                {Number(job.experienceMinYears)}+ years
              </strong>
            </div>
          )}
          <div className="highlight-pill-box">
            <span className="highlight-label">Vacancies</span>
            <strong className="highlight-value">{job.vacanciesCount} Open</strong>
          </div>
          <div className="highlight-pill-box">
            <span className="highlight-label">Closing Date</span>
            <strong className="highlight-value">{new Date(job.applicationDeadline).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      <div className="job-content-columns">
        <div className="job-main-specs">
          {(job.category || job.responsibilities || job.description) && (
            <section className="spec-card">
              <h2>Responsibilities</h2>
              {job.category && (
                <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>{job.category.name}</p>
              )}
              {(() => {
                const resp = job.responsibilities?.trim();
                const desc = job.description?.trim();
                const body =
                  resp && desc && resp === desc ? resp : resp || desc;
                return body ? <div className="prose-content">{body}</div> : null;
              })()}
            </section>
          )}

          {job.requirements && (
            <section className="spec-card">
              <h2>Required Qualifications and Skills</h2>
              <div className="prose-content">{job.requirements}</div>
            </section>
          )}

          {job.skills && job.skills.length > 0 && (
            <section className="spec-card">
              <h2>Desired Skills & Competencies</h2>
              <div className="skills-tag-grid">
                {job.skills.map((s) => (
                  <span key={s.id} className={`skill-badge ${s.isRequired ? 'skill-required' : ''}`}>
                    {s.skill.name} {s.isRequired && '• Required'}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.screeningQuestions && job.screeningQuestions.length > 0 && (
            <section className="spec-card">
              <h2>Screening Process</h2>
              <p className="screening-intro">
                This employer has configured <strong>{job.screeningQuestions.length} screening questions</strong>{' '}
                to assess candidate suitability during the application step.
              </p>
            </section>
          )}
        </div>

        <aside className="job-sidebar-specs">
          <div className="sticky-apply-card">
            <h3>Ready to Apply?</h3>
            <p className="apply-deadline-note">
              Application closes on <strong>{new Date(job.applicationDeadline).toLocaleDateString()}</strong>
            </p>

            <div className="apply-actions-stack">
              {!user ? (
                <>
                  <p className="apply-helper-text">
                    Sign in with your Progress candidate account to submit your credentials and CV.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: `/jobs/${job.slug}/apply` }}
                    className="btn-apply-primary"
                  >
                    Sign In to Apply
                  </Link>
                  <Link to="/register" className="btn-apply-secondary">
                    Register as Candidate
                  </Link>
                </>
              ) : hasRole('candidate') ? (
                <Link to={`/jobs/${job.slug}/apply`} className="btn-apply-primary">
                  <span>Submit Application</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </Link>
              ) : (
                <div className="role-note-card">
                  Signed in as <strong>{user.roles.join(', ')}</strong>. Job applications are open to candidate accounts.
                </div>
              )}
            </div>

            <div className="agency-guarantee-footer">
              <span className="guarantee-shield">🛡️</span>
              <span>Vetted & verified by Progress Manpower Supply & Training PLC</span>
            </div>
          </div>

          {job.company && (
            <div className="company-preview-card">
              <h4>About the Employer</h4>
              {logoId && (
                <img
                  src={publicFileUrl(logoId)}
                  alt=""
                  style={{ maxWidth: 80, maxHeight: 48, objectFit: 'contain', marginBottom: '0.5rem' }}
                />
              )}
              <p className="company-preview-name">{job.company.name}</p>
              {job.company.description && (
                <p className="company-preview-desc">{job.company.description.slice(0, 160)}...</p>
              )}
              <Link to={`/companies/${job.company.slug}`} className="btn-view-company">
                View Company Profile →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
