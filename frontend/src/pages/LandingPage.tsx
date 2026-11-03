import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFeaturedJobs } from '../hooks/useFeaturedJobs';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import { HeroCanvas } from '../components/HeroCanvas';
import { BlurText } from '../components/reactbits/BlurText';
import { ShinyText } from '../components/reactbits/ShinyText';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { CountUp } from '../components/reactbits/CountUp';
import { useAuth } from '../auth/AuthContext';
import { GuestJobAccessNote, JobDetailLink } from '../components/JobDetailLink';
import { CompanyLogoMark } from '../components/CompanyLogoMark';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const popularQuery = useQuery({
    queryKey: ['jobs', 'popular-searches'],
    queryFn: () => jobsApi.popularSearches(8),
  });
  const popularJobs = popularQuery.data?.data ?? [];

  const fallbackPopular = [
    { id: 'cat-ngo', label: 'NGO Jobs', path: '/jobs?category=ngo-and-development' },
    { id: 'cat-acc', label: 'Accounting/Finance Jobs', path: '/jobs?category=accounting-and-finance' },
    { id: 'cat-health', label: 'Health Care Jobs', path: '/jobs?category=health-care' },
    { id: 'cat-salary', label: 'Jobs by Salary', path: '/jobs?salary=listed' },
    { id: 'cat-fg', label: 'Fresh Graduate Jobs', path: '/jobs?experience=0' },
  ];
  const displayPopular = popularJobs.length > 0 ? popularJobs : fallbackPopular;
  // Fetch featured vacancies
  const jobsQuery = useFeaturedJobs();

  // Fetch categories for search and category grid
  const categoriesQuery = useQuery({
    queryKey: ['taxonomy-categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    navigate(term ? `/jobs?q=${encodeURIComponent(term)}` : '/jobs');
  };

  return (
    <div className="landing-page">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <HeroCanvas />

        <div className="hero-glow-aura" />

        <div className="hero-content">
          <div className="hero-badge animate-fade-in">
            <span className="badge-dot" />
            <ShinyText
              text="Progress Manpower Supply & Training PLC • Licensed & Certified"
              speed={4}
            />
          </div>

          <h1 className="hero-headline">
            <BlurText text="We Handpick The Best" delay={55} animateBy="words" />
            <br />
            <span className="text-gradient">
              <BlurText text="Among The Rest." delay={75} animateBy="words" />
            </span>
          </h1>

          <p className="hero-subtitle">
            We understand that talent drives your business strategy, and we make it our business to
            find that talent. Headquartered in Dukem, Oromia, empowering businesses and careers across
            Adama and Bishoftu.
          </p>

          <form className="home-find" onSubmit={handleSearch}>
            <div className="home-find-bar">
              <svg
                className="home-find-search-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search job title, keywords…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search job title, keywords"
              />
              <button type="submit" className="home-find-btn">
                <span>FIND JOBS</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" />
                </svg>
              </button>
            </div>

            {displayPopular.length > 0 && (
              <div className="home-find-popular">
                <span className="home-find-popular-label">POPULAR JOBS:</span>
                <div className="home-find-chips">
                  {displayPopular.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className="home-find-chip"
                      title={'count' in item && item.count !== undefined ? `${item.count} open vacancies` : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 2. STATS SECTION WITH COUNT UP */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">
              <CountUp to={1400} suffix="+" duration={2.2} />
            </span>
            <span className="stat-label">Active Vacancies</span>
            <span className="stat-desc">Direct from verified Ethiopian employers</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              <CountUp to={380} suffix="+" duration={2} />
            </span>
            <span className="stat-label">Partner Companies</span>
            <span className="stat-desc">Leading corporations, NGOs & manufacturers</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              <CountUp to={14} duration={1.5} />
            </span>
            <span className="stat-label">Regional Hubs</span>
            <span className="stat-desc">Nationwide coverage across Ethiopia</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              <CountUp to={99} suffix=".4%" duration={2} />
            </span>
            <span className="stat-label">Placement Success</span>
            <span className="stat-desc">Rigorous candidate qualification rate</span>
          </div>
        </div>
      </section>

      {/* 3. BENTO GRID: WHY PROGRESS WITH SPOTLIGHT */}
      <section className="bento-section">
        <div className="section-header">
          <span className="section-eyebrow">Enterprise Solutions</span>
          <h2 className="section-title">The Progress Advantage</h2>
          <p className="section-subtitle">
            Comprehensive manpower, staffing, and corporate training solutions built for Ethiopian
            economic growth.
          </p>
        </div>

        <div className="bento-grid">
          <SpotlightCard className="bento-card bento-card-large">
            <div className="bento-header-row">
              <div className="bento-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" />
                  <circle cx="9" cy="7" r="4" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" />
                </svg>
              </div>
              <span className="bento-badge">Core Capability</span>
            </div>
            <h3>Manpower Supply & Technical Staffing</h3>
            <p>
              We provide turnkey permanent and contract workforce solutions. From industrial production
              lines and logistics to executive finance and engineering, we deploy pre-vetted professionals
              tailored to your exact operational requirements.
            </p>
            <div className="bento-features">
              <span className="feature-pill">✓ Pre-screened candidates</span>
              <span className="feature-pill">✓ Rapid 48h deployment</span>
              <span className="feature-pill">✓ Contract & Permanent</span>
              <span className="feature-pill">✓ Payroll & Compliance Support</span>
            </div>
          </SpotlightCard>

          <SpotlightCard className="bento-card">
            <div className="bento-header-row">
              <div className="bento-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeWidth="2" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" strokeWidth="2" />
                </svg>
              </div>
              <span className="bento-badge">Accredited</span>
            </div>
            <h3>Professional Training PLC</h3>
            <p>
              Certified corporate training programs in leadership, compliance, industrial safety, and
              modern technical proficiencies to upskill your team.
            </p>
            <div className="bento-chip-list">
              <span className="bento-chip">Leadership</span>
              <span className="bento-chip">Safety & OSHA</span>
              <span className="bento-chip">Technical Skills</span>
            </div>
          </SpotlightCard>

          <SpotlightCard className="bento-card">
            <div className="bento-header-row">
              <div className="bento-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" />
                  <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="bento-badge">Government Certified</span>
            </div>
            <h3>Bureau Licensed & Certified</h3>
            <p>
              Fully registered and certified under the O/R/ G/Labor & Social Affairs Bureau, guaranteeing
              ethical, compliant, and transparent recruitment standards.
            </p>
            <div className="bento-chip-list">
              <span className="bento-chip">100% Legal Compliance</span>
              <span className="bento-chip">Audited Practices</span>
            </div>
          </SpotlightCard>

          <SpotlightCard className="bento-card">
            <div className="bento-header-row">
              <div className="bento-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" strokeWidth="2" />
                </svg>
              </div>
              <span className="bento-badge">Nationwide</span>
            </div>
            <h3>Dukem HQ & National Reach</h3>
            <p>
              Strategically headquartered in Dukem, Oromia, with active deployment networks supporting
              major industrial parks and metropolitan centers nationwide.
            </p>
            <div className="bento-chip-list">
              <span className="bento-chip">Industrial Parks</span>
              <span className="bento-chip">Addis & Regional Hubs</span>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* 4. FEATURED JOBS SECTION */}
      <section className="featured-jobs-section">
        <div className="section-header-row">
          <div>
            <span className="section-eyebrow">Verified Vacancies</span>
            <h2 className="section-title">{jobsQuery.title}</h2>
            <p className="section-subtitle">
              {jobsQuery.description}
              {jobsQuery.showProfileLink && <> <Link to="/candidate/profile">Update profile</Link></>}
            </p>
            {!user && <GuestJobAccessNote />}
          </div>
          <Link to="/jobs" className="btn-view-all-jobs">
            <span>View more</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {jobsQuery.isError ? (
          <p role="alert">Could not load opportunities. <button type="button" onClick={() => void jobsQuery.refetch()}>Try again</button></p>
        ) : jobsQuery.isLoading ? (
          <div className="featured-jobs-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="job-card-skeleton" />
            ))}
          </div>
        ) : jobsQuery.data?.data && jobsQuery.data.data.length > 0 ? (
          <div className="featured-jobs-grid">
            {jobsQuery.data.data.slice(0, 6).map((job) => {
              const hasSalary = Boolean(job.salaryVisibility && (job.salaryMin || job.salaryMax));
              const salary = hasSalary
                ? `${job.salaryCurrency ?? 'ETB'} ${[job.salaryMin, job.salaryMax]
                    .filter((value): value is number => value != null)
                    .map((value) => Number(value).toLocaleString())
                    .join(' – ')}`
                : null;
              const meta = [job.location?.name, job.employmentType.replace(/_/g, ' ')].filter(Boolean).join(' · ');
              return (
                <article key={job.id} className="home-feature-card">
                  <div className="home-feature-top">
                    <div className="home-job-logo">
                      <CompanyLogoMark
                        name={job.company?.name}
                        logoId={job.company?.logo?.id ?? job.company?.logoFileId}
                        imgClassName="company-logo-img"
                      />
                    </div>
                    <div className="home-feature-copy">
                      <span className="home-feature-company">{job.company?.name ?? 'Progress Partner'}</span>
                      <h3>
                        <JobDetailLink slug={job.slug}>{job.title}</JobDetailLink>
                      </h3>
                    </div>
                  </div>
                  {meta ? <p className="home-feature-meta">{meta}</p> : null}
                  <div className="home-feature-foot">
                    <span className={salary ? 'home-feature-pay' : 'home-feature-pay is-quiet'}>
                      {salary ? (
                        <>
                          {salary}
                          <small> / month</small>
                        </>
                      ) : (
                        `Closes ${new Date(job.applicationDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      )}
                    </span>
                    <JobDetailLink slug={job.slug} className="home-feature-view">
                      <span>View</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </JobDetailLink>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-jobs-banner">
            <p>No featured vacancies are currently published. Browse our live database.</p>
            <Link to="/jobs" className="btn-nav-register">
              Browse All Jobs
            </Link>
          </div>
        )}
      </section>

      {/* 5. POPULAR CATEGORIES SECTION */}
      <section className="categories-section">
        <div className="section-header">
          <span className="section-eyebrow">Explore Sectors</span>
          <h2 className="section-title">Browse By Job Category</h2>
          <p className="section-subtitle">Discover vacancies tailored to your specialized domain</p>
        </div>

        <div className="categories-grid">
          {categoriesQuery.data?.slice(0, 10).map((cat) => (
            <Link key={cat.id} to={`/jobs?category=${cat.slug}`} className="category-tile">
              <div className="cat-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
                </svg>
              </div>
              <div className="cat-info">
                <span className="cat-name">{cat.name}</span>
                <span className="cat-explore">Explore Openings →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {!user && (
        <section className="dual-cta-section">
          <div className="cta-grid">
            <div className="cta-box cta-candidate">
              <span className="cta-eyebrow">For Candidates</span>
              <h3>Accelerate Your Career Trajectory</h3>
              <p>
                Create your candidate profile, upload your resume, and get matched with verified corporate
                vacancies across Ethiopia.
              </p>
              <div className="cta-actions">
                <Link to="/register" className="btn-cta-primary">
                  Create account
                </Link>
                <Link to="/jobs" className="btn-cta-secondary">
                  Browse Vacancies
                </Link>
              </div>
            </div>

            <div className="cta-box cta-employer">
              <span className="cta-eyebrow">For Employers</span>
              <h3>Post a job from the same account</h3>
              <p>
                Create one account to look for work. When you want to hire, add who is hiring and post
                the vacancy on the site. New posts still go to admin review before they go live.
              </p>
              <div className="cta-actions">
                <Link to="/register" className="btn-cta-primary">
                  Post a job
                </Link>
                <Link to="/login" className="btn-cta-secondary">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
