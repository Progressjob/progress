import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../../types/api';
import { companyLabel, jobDeadlineDays } from '../../utils/jobListing';
import { CompanyLogoMark } from '../CompanyLogoMark';
import { JobDetailLink } from '../JobDetailLink';

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
  badge?: string | ((job: Job) => string);
  publicLinks?: boolean;
  hrefFor?: (job: Job) => string;
  footer?: (job: Job) => React.ReactNode;
}> = ({
  jobs,
  loading,
  publicLinks = true,
  hrefFor,
  title = 'Featured vacancies',
  description = 'Top opportunities for you',
  badge,
  footer,
}) => {
  const defaultBadge = title === 'Recommended for you' ? 'For you' : 'Featured';
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
    <section className="jb-featured" aria-label={title}>
      <div className="jb-featured-head">
        <div>
          <p className="jb-kicker jb-featured-kicker-desktop">
            <span className="jb-kicker-star" aria-hidden>
              ★
            </span>
            {title}
          </p>
          <h2 className="jb-section-title jb-featured-title-desktop">{description}</h2>
          <h2 className="jb-featured-heading-mobile">Open roles matched to your profession</h2>
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
            const cardBadge = typeof badge === 'function' ? badge(job) : (badge ?? defaultBadge);
            return (
              <article key={job.id} className={`jb-featured-card${footer ? ' has-footer' : ''}`}>
                <div className="jb-featured-top">
                  <div className="jb-featured-logo">
                    <CompanyLogoMark
                      name={job.company?.name}
                      logoId={job.company?.logo?.id ?? job.company?.logoFileId}
                      className="jb-company-logo jb-company-logo-fallback"
                      imgClassName="jb-company-logo"
                    />
                  </div>
                  <span className="jb-featured-label">{cardBadge}</span>
                </div>
                <h3 className="jb-featured-title">
                  <TitleLink job={job} publicLinks={publicLinks} href={href} />
                </h3>
                <p className="jb-featured-company">{companyLabel(job)}</p>
                {job.company?.industry?.name ? (
                  <p className="jb-featured-industry">{job.company.industry.name}</p>
                ) : null}
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
                {footer ? <div className="jb-featured-extra">{footer(job)}</div> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
