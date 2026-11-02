import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../../types/api';
import { companyLabel, jobDeadlineDays } from '../../utils/jobListing';
import { JobDetailLink } from '../JobDetailLink';

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="1.8" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="1.8" />
      <path d="M3 12h18" strokeWidth="1.8" />
    </svg>
  );
}

function TitleLink({
  job,
  publicLinks,
  href,
}: {
  job: Job;
  publicLinks: boolean;
  href: string;
}) {
  if (publicLinks) {
    return <JobDetailLink slug={job.slug}>{job.title}</JobDetailLink>;
  }
  return <Link to={href}>{job.title}</Link>;
}

export const FeaturedVacancies: React.FC<{
  jobs: Job[];
  loading?: boolean;
  title?: string;
  description?: string;
  publicLinks?: boolean;
  hrefFor?: (job: Job) => string;
}> = ({
  jobs,
  loading,
  publicLinks = true,
  hrefFor,
  title = 'Featured vacancies',
  description = 'Top opportunities for you',
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.jb-featured-card');
    const amount = (card?.offsetWidth ?? 260) + 16;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  if (!loading && jobs.length === 0) return null;

  return (
    <section className="jb-featured" aria-label="Featured vacancies">
      <div className="jb-featured-head">
        <div>
          <p className="jb-kicker">
            <span className="jb-kicker-star" aria-hidden>
              ★
            </span>
            {title}
          </p>
          <h2 className="jb-section-title">{description}</h2>
        </div>
        {jobs.length > 1 && (
          <div className="jb-featured-nav">
            <button type="button" className="jb-nav-btn" aria-label="Previous featured jobs" onClick={() => scrollByCard(-1)}>
              ‹
            </button>
            <button type="button" className="jb-nav-btn" aria-label="Next featured jobs" onClick={() => scrollByCard(1)}>
              ›
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="jb-featured-track">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="jb-featured-card is-skeleton" />
          ))}
        </div>
      ) : (
        <div ref={scrollerRef} className="jb-featured-track">
          {jobs.map((job) => {
            const deadline = jobDeadlineDays(job.applicationDeadline);
            const href = hrefFor ? hrefFor(job) : `/jobs/${job.slug}`;
            return (
              <article key={job.id} className="jb-featured-card">
                <div className="jb-featured-top">
                  <span className="jb-featured-icon">
                    <BriefcaseIcon />
                  </span>
                  <span className="jb-featured-label">
                    {title === 'Recommended for you' ? 'For you' : 'Featured'}
                  </span>
                </div>
                <h3 className="jb-featured-title">
                  <TitleLink job={job} publicLinks={publicLinks} href={href} />
                </h3>
                <p className="jb-featured-company">{companyLabel(job)}</p>
                <div className="jb-featured-foot">
                  <div className={`jb-deadline${deadline.urgent ? ' is-urgent' : ''}`}>
                    <span className="jb-deadline-label">Deadline</span>
                    <strong>{deadline.label}</strong>
                  </div>
                  {publicLinks ? (
                    <JobDetailLink slug={job.slug} className="jb-featured-go">
                      <span className="jb-sr-only">View {job.title}</span>
                      <ArrowIcon />
                    </JobDetailLink>
                  ) : (
                    <Link to={href} className="jb-featured-go" aria-label={`Open ${job.title}`}>
                      <ArrowIcon />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
