import React from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../../types/api';
import { companyLabel, jobPostedLabel, locationLabel } from '../../utils/jobListing';
import { JobDetailLink } from '../JobDetailLink';

export const LatestVacanciesGrid: React.FC<{
  jobs: Job[];
  loading?: boolean;
  publicLinks?: boolean;
  hrefFor?: (job: Job) => string;
  footer?: (job: Job) => React.ReactNode;
}> = ({ jobs, loading, publicLinks = true, hrefFor, footer }) => {
  if (loading) {
    return (
      <div className="jb-latest-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="jb-latest-item is-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="jb-latest-grid">
      {jobs.map((job) => {
        const href = hrefFor ? hrefFor(job) : `/jobs/${job.slug}`;
        const posted = jobPostedLabel(job.postedAt || job.createdAt);
        return (
          <article key={job.id} className={`jb-latest-item${footer ? ' has-footer' : ''}`}>
            <div className="jb-latest-top">
              <h3 className="jb-latest-title">
                {publicLinks ? (
                  <JobDetailLink slug={job.slug}>{job.title}</JobDetailLink>
                ) : (
                  <Link to={href}>{job.title}</Link>
                )}
              </h3>
              <span className="jb-latest-posted">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <path d="M12 7v5l3 2" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Posted {posted}
              </span>
            </div>
            <p className="jb-latest-company">{companyLabel(job)}</p>
            <p className="jb-latest-location">{locationLabel(job)}</p>
            {footer ? <div className="jb-latest-footer">{footer(job)}</div> : null}
          </article>
        );
      })}
    </div>
  );
};
