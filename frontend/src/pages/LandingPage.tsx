import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { taxonomyApi } from '../api/taxonomy';
import { HeroCanvas } from '../components/HeroCanvas';
import { CustomDropdown, type DropdownOption } from '../components/CustomDropdown';
import { BlurText } from '../components/reactbits/BlurText';
import { ShinyText } from '../components/reactbits/ShinyText';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { CountUp } from '../components/reactbits/CountUp';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Fetch featured vacancies
  const jobsQuery = useQuery({
    queryKey: ['landing-jobs'],
    queryFn: () => jobsApi.list({ limit: 6 }),
  });

  // Fetch categories for search and category grid
  const categoriesQuery = useQuery({
    queryKey: ['taxonomy-categories'],
    queryFn: () => taxonomyApi.categories(),
  });

  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...(categoriesQuery.data?.map((cat) => ({
      value: cat.slug,
      label: cat.name,
    })) || []),
  ];

  // Specific Progress operational regions: Adama and Bishoftu
  const regionOptions: DropdownOption[] = [
    { value: '', label: 'All Regions' },
    { value: 'adama-oromia', label: 'Adama' },
    { value: 'bishoftu-oromia', label: 'Bishoftu' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedLocation) params.set('location', selectedLocation);
    navigate(`/jobs?${params.toString()}`);
  };

  const quickTags = [
    { label: 'Adama', type: 'location', value: 'adama-oromia' },
    { label: 'Bishoftu', type: 'location', value: 'bishoftu-oromia' },
    { label: 'Information Technology', type: 'category', value: 'information-technology' },
    { label: 'Accounting & Finance', type: 'category', value: 'accounting-and-finance' },
    { label: 'Engineering', type: 'category', value: 'engineering' },
    { label: 'Manufacturing & Operations', type: 'category', value: 'manufacturing' },
  ];

  return (
    <div className="landing-page">
      {/* 1. HERO SECTION WITH 3D CANVAS & FLOATING CARDS */}
      <section className="hero-section">
        <HeroCanvas />

        {/* Ambient Radial Gradient Aura */}
        <div className="hero-glow-aura" />

        {/* Floating Glass Badges (Desktop) */}
        <div className="hero-floating-card floating-card-left">
          <div className="floating-card-icon">⚡</div>
          <div className="floating-card-text">
            <strong>Rapid Deployment</strong>
            <span>Talent matched within 48h</span>
          </div>
        </div>

        <div className="hero-floating-card floating-card-right">
          <div className="floating-card-icon verified-shield">🛡️</div>
          <div className="floating-card-text">
            <strong>100% Certified Agency</strong>
            <span>Labor & Social Affairs Bureau</span>
          </div>
        </div>

        <div className="hero-floating-card floating-card-bottom">
          <span className="live-pulse-dot" />
          <div className="floating-card-text">
            <strong>1,400+ Active Roles</strong>
            <span>Direct employer postings</span>
          </div>
        </div>

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

          {/* Luxury Floating Smart Search Capsule */}
          <form className="hero-search-card" onSubmit={handleSearch}>
            <div className="search-field">
              <div className="search-icon-circle">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8" strokeWidth="2.2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Job title, keywords, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search jobs"
              />
            </div>

            <div className="search-divider" />

            <div className="search-field-custom">
              <CustomDropdown
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryOptions}
                placeholder="All Categories"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
                  </svg>
                }
              />
            </div>

            <div className="search-divider" />

            <div className="search-field-custom">
              <CustomDropdown
                value={selectedLocation}
                onChange={setSelectedLocation}
                options={regionOptions}
                placeholder="All Regions"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                    <circle cx="12" cy="10" r="3" strokeWidth="2" />
                  </svg>
                }
              />
            </div>

            <button type="submit" className="btn-search-hero">
              <span>Find Opportunities</span>
              <svg className="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          {/* Quick Trending Tags */}
          <div className="quick-tags-container">
            <span className="quick-tags-label">Trending Searches:</span>
            <div className="quick-tags-list">
              {quickTags.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  className="quick-tag-pill"
                  onClick={() => {
                    navigate(`/jobs?${tag.type}=${tag.value}`);
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
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
            <h2 className="section-title">Featured Opportunities</h2>
            <p className="section-subtitle">Handpicked roles open for direct candidate application</p>
          </div>
          <Link to="/jobs" className="btn-view-all-jobs">
            <span>Explore All Vacancies</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {jobsQuery.isLoading ? (
          <div className="jobs-loading-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="job-card-skeleton" />
            ))}
          </div>
        ) : jobsQuery.data?.data && jobsQuery.data.data.length > 0 ? (
          <div className="featured-jobs-grid">
            {jobsQuery.data.data.map((job) => (
              <SpotlightCard key={job.id} className="premium-job-card">
                <div className="job-card-header">
                  <div className="company-badge">
                    {job.company?.name ? job.company.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div className="job-card-meta">
                    <span className="job-company-name">{job.company?.name ?? 'Progress Partner'}</span>
                    <h3 className="job-card-title">
                      <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
                    </h3>
                  </div>
                </div>

                <div className="job-card-tags">
                  {job.location && (
                    <span className="tag-pill tag-location">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                      </svg>
                      {job.location.name}
                    </span>
                  )}
                  <span className="tag-pill tag-type">
                    {job.employmentType.replace('_', ' ').toUpperCase()}
                  </span>
                  {job.workplaceType && (
                    <span className="tag-pill tag-workplace">{job.workplaceType}</span>
                  )}
                </div>

                {job.salaryVisibility && (job.salaryMin || job.salaryMax) && (
                  <div className="job-salary">
                    <span className="salary-amount">
                      {job.salaryCurrency ?? 'ETB'}{' '}
                      {job.salaryMin ? Number(job.salaryMin).toLocaleString() : ''}
                      {job.salaryMin && job.salaryMax ? ' - ' : ''}
                      {job.salaryMax ? Number(job.salaryMax).toLocaleString() : ''}
                    </span>
                    <span className="salary-period">/ month</span>
                  </div>
                )}

                <div className="job-card-footer">
                  <span className="job-deadline">
                    Closing: {new Date(job.applicationDeadline).toLocaleDateString()}
                  </span>
                  <Link to={`/jobs/${job.slug}`} className="btn-card-apply">
                    <span>View Role</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>
              </SpotlightCard>
            ))}
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

      {/* 6. DUAL CALL TO ACTION */}
      <section className="dual-cta-section">
        <div className="cta-grid">
          {/* Candidates CTA */}
          <div className="cta-box cta-candidate">
            <span className="cta-eyebrow">For Candidates</span>
            <h3>Accelerate Your Career Trajectory</h3>
            <p>
              Create your candidate profile, upload your resume, and get matched with verified corporate
              vacancies across Ethiopia.
            </p>
            <div className="cta-actions">
              <Link to="/register" className="btn-cta-primary">
                Register as Candidate
              </Link>
              <Link to="/jobs" className="btn-cta-secondary">
                Browse Vacancies
              </Link>
            </div>
          </div>

          {/* Employers CTA */}
          <div className="cta-box cta-employer">
            <span className="cta-eyebrow">For Enterprise</span>
            <h3>Partner with Progress Manpower PLC</h3>
            <p>
              Need certified technical workforce, executive search, or specialized workforce training?
              Our recruitment specialists are ready to support your enterprise.
            </p>
            <div className="cta-actions">
              <Link to="/contact" className="btn-cta-primary">
                Contact Dukem HQ
              </Link>
              <Link to="/login" className="btn-cta-secondary">
                Employer Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
