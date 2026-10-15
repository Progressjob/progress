import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { useAuth } from '../auth/AuthContext';

export const JobDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, hasRole } = useAuth();

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.detail(slug!, 'job_detail_page'),
    enabled: Boolean(slug),
  });

  if (jobQuery.isLoading) {
    return <div className="card">Loading job details...</div>;
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="card alert-error">
        <h2>Job Not Found</h2>
        <p>{(jobQuery.error as Error)?.message || 'Could not load job details.'}</p>
        <Link to="/jobs" className="btn btn-sm">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const job = jobQuery.data;

  return (
    <div className="stack">
      <div>
        <Link to="/jobs" className="muted">
          ← Back to Job Search
        </Link>
      </div>

      <div className="card">
        <div className="job-card-header">
          <div>
            <h1>{job.title}</h1>
            <div className="job-meta">
              {job.company && (
                <Link to={`/companies/${job.company.slug}`}>
                  <strong>{job.company.name}</strong>
                </Link>
              )}
              {job.location && <span>• {job.location.name}</span>}
              {job.category && <span>• {job.category.name}</span>}
              {job.referenceCode && <span>• Ref: {job.referenceCode}</span>}
            </div>
          </div>
          <div className="badges">
            <span className="badge">{job.employmentType}</span>
            <span className="badge badge-outline">{job.workplaceType}</span>
            <span className="badge badge-info">Method: {job.applicationMethod}</span>
          </div>
        </div>

        <hr />

        <div className="grid-two">
          <div>
            <strong>Application Deadline:</strong>{' '}
            {new Date(job.applicationDeadline).toLocaleDateString()}
          </div>
          <div>
            <strong>Vacancies:</strong> {job.vacanciesCount}
          </div>
          {job.careerLevel && (
            <div>
              <strong>Career Level:</strong> {job.careerLevel}
            </div>
          )}
          {job.salaryVisibility && (job.salaryMin || job.salaryMax) && (
            <div>
              <strong>Salary:</strong> {job.salaryMin ?? '?'} – {job.salaryMax ?? '?'}{' '}
              {job.salaryCurrency ?? 'ETB'}
            </div>
          )}
        </div>

        <hr />

        <h3>Job Description</h3>
        <div className="prose">{job.description}</div>

        {job.responsibilities && (
          <>
            <h3>Responsibilities</h3>
            <div className="prose">{job.responsibilities}</div>
          </>
        )}

        {job.requirements && (
          <>
            <h3>Requirements</h3>
            <div className="prose">{job.requirements}</div>
          </>
        )}

        {job.skills && job.skills.length > 0 && (
          <>
            <h3>Skills</h3>
            <div className="badges">
              {job.skills.map((s) => (
                <span key={s.id} className="badge badge-outline">
                  {s.skill.name} {s.isRequired ? '(Required)' : ''}
                </span>
              ))}
            </div>
          </>
        )}

        {job.screeningQuestions && job.screeningQuestions.length > 0 && (
          <>
            <h3>Screening Questions ({job.screeningQuestions.length})</h3>
            <ul>
              {job.screeningQuestions.map((q) => (
                <li key={q.id}>
                  {q.questionText} <small className="muted">({q.questionType})</small>{' '}
                  {q.isRequired && <strong className="req">*Required</strong>}
                </li>
              ))}
            </ul>
          </>
        )}

        <hr />

        <div className="apply-box">
          <h3>How to Apply</h3>
          {job.applicationMethod === 'internal' && (
            <div>
              {!user ? (
                <div>
                  <p>Sign in with a candidate account to submit an internal application.</p>
                  <Link to="/login" state={{ from: `/jobs/${job.slug}/apply` }} className="btn">
                    Login to Apply
                  </Link>{' '}
                  <Link to="/register" className="btn btn-secondary">
                    Register as Candidate
                  </Link>
                </div>
              ) : hasRole('candidate') ? (
                <Link to={`/jobs/${job.slug}/apply`} className="btn">
                  Apply Now (Internal)
                </Link>
              ) : (
                <p className="muted">
                  Logged in as <code>{user.roles.join(', ')}</code>. Only <code>candidate</code>{' '}
                  accounts can apply to jobs.
                </p>
              )}
            </div>
          )}

          {job.applicationMethod === 'external_url' && (
            <div>
              <p>This position accepts applications via an external website:</p>
              {job.applicationUrl ? (
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                >
                  Apply on External Site ↗
                </a>
              ) : (
                <p className="muted">External URL not provided.</p>
              )}
              {job.applicationInstructions && <p>{job.applicationInstructions}</p>}
            </div>
          )}

          {job.applicationMethod === 'email' && (
            <div>
              <p>This position accepts applications via email:</p>
              {job.applicationEmail && (
                <p>
                  Send your application to:{' '}
                  <a href={`mailto:${job.applicationEmail}`}>{job.applicationEmail}</a>
                </p>
              )}
              {job.applicationInstructions && <p>{job.applicationInstructions}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
