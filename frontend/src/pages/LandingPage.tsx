import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFeaturedJobs } from '../hooks/useFeaturedJobs';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import { HeroCanvas } from '../components/HeroCanvas';
import { BlurText } from '../components/reactbits/BlurText';
import { ShinyText } from '../components/reactbits/ShinyText';

import { CountUp } from '../components/reactbits/CountUp';
import { useAuth } from '../auth/AuthContext';
import { GuestJobAccessNote, JobDetailLink } from '../components/JobDetailLink';
import { CompanyLogoMark } from '../components/CompanyLogoMark';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'candidates' | 'employers'>('candidates');

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

      {/* 3. HOW PROGRESS WORKS FOR YOU */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          {/* Left Column: Visual Media Card */}
          <div className="how-media-card">
            <div className="how-image-wrapper">
              <img
                src={activeTab === 'candidates' ? '/images/candidate-works.jpg' : '/images/employer-works.jpg'}
                alt={activeTab === 'candidates' ? 'Candidate career journey with Progress' : 'Enterprise partner with Progress'}
                className="how-main-image"
                key={activeTab}
              />
              <div className="how-story-badge">
                <div className="how-story-icon">
                  {activeTab === 'candidates' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                      <path d="M10 6h4" />
                      <path d="M10 10h4" />
                      <path d="M10 14h4" />
                      <path d="M10 18h4" />
                    </svg>
                  )}
                </div>
                <div className="how-story-text">
                  <span className="how-story-label">
                    {activeTab === 'candidates' ? 'SUCCESS STORY' : 'ENTERPRISE IMPACT'}
                  </span>
                  <p className="how-story-quote">
                    {activeTab === 'candidates'
                      ? 'Progress changed my career path!'
                      : 'Hired certified specialists in 48 hours!'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Steps & Tabs */}
          <div className="how-content-col">
            <h2 className="how-section-title">
              HOW <span className="how-brand-highlight">PROGRESS</span><br />
              WORKS FOR YOU
            </h2>

            {/* Toggle Switcher */}
            <div className="how-tabs-nav" role="tablist" aria-label="Audience view switcher">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'candidates'}
                className={`how-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
                onClick={() => setActiveTab('candidates')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>JOB SEEKERS</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'employers'}
                className={`how-tab-btn ${activeTab === 'employers' ? 'active' : ''}`}
                onClick={() => setActiveTab('employers')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                  <path d="M9 22v-4h6v4" />
                  <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
                </svg>
                <span>EMPLOYERS</span>
              </button>
            </div>

            {/* 3 Steps List */}
            {activeTab === 'candidates' ? (
              <div className="how-steps-list animate-fade-in">
                <div className="how-step-item">
                  <div className="how-step-num">1</div>
                  <div className="how-step-body">
                    <h3>Build a Standout Profile</h3>
                    <p>
                      Create a professional digital CV and verified profile that captures the attention of
                      top-tier Ethiopian employers, manufacturing hubs, and NGOs.
                    </p>
                  </div>
                </div>

                <div className="how-step-item">
                  <div className="how-step-num">2</div>
                  <div className="how-step-body">
                    <h3>Smart Matching & Alerts</h3>
                    <p>
                      Discover verified vacancies across Dukem, Addis Ababa, and regional industrial parks
                      with transparent salary ranges and instant job notifications.
                    </p>
                  </div>
                </div>

                <div className="how-step-item">
                  <div className="how-step-num">3</div>
                  <div className="how-step-body">
                    <h3>Land Your Dream Role</h3>
                    <p>
                      Connect directly with hiring managers, track your applications in real-time, and
                      accelerate your career growth with Progress certified placements.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="how-steps-list animate-fade-in">
                <div className="how-step-item">
                  <div className="how-step-num">1</div>
                  <div className="how-step-body">
                    <h3>Post Targeted Vacancies</h3>
                    <p>
                      Publish vacancies in minutes with tailored skill criteria, role specifications, and
                      salary parameters to attract qualified candidates across Ethiopia.
                    </p>
                  </div>
                </div>

                <div className="how-step-item">
                  <div className="how-step-num">2</div>
                  <div className="how-step-body">
                    <h3>Access Pre-Vetted Talent</h3>
                    <p>
                      Browse our extensive pool of pre-screened professionals, technicians, and specialized
                      manpower accredited under regional labor bureau regulations.
                    </p>
                  </div>
                </div>

                <div className="how-step-item">
                  <div className="how-step-num">3</div>
                  <div className="how-step-body">
                    <h3>Rapid 48h Workforce Deployment</h3>
                    <p>
                      Review shortlisted applicants, conduct interviews seamlessly, and deploy verified
                      workforce solutions quickly with guaranteed contract compliance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Button — guests only; signed-in users already have an account */}
            {!user && (
              <div className="how-cta-wrap">
                <Link to="/register" className="how-cta-btn">
                  <span>GET STARTED NOW</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
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

        <div className="mobile-category-picker">
          <div className="mobile-category-shortcuts" aria-label="Explore job categories">
            {categoriesQuery.data?.slice(0, 4).map((category) => (
              <Link key={category.id} to={`/jobs?category=${encodeURIComponent(category.slug)}`}>
                <span>{category.name}</span><span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <label htmlFor="home-mobile-category">More fields</label>
          <select id="home-mobile-category" defaultValue="" onChange={(event) => {
            if (event.target.value) navigate(`/jobs?category=${encodeURIComponent(event.target.value)}`);
          }}>
            <option value="" disabled>Browse job categories</option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.slug}>{category.name}</option>
            ))}
          </select>
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
