import React, { useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { filesApi, publicFileUrl } from '../api/files';
import {
  displayOrFallback,
  experienceStageLabel,
  isOpenToOpportunities,
  locationLine,
  profileStrength,
  websiteHref,
} from '../utils/candidateProfile';

const TABS = [
  { to: '/candidate/profile', label: 'My Profile' },
  { to: '/candidate/applications', label: 'My Applications' },
  { to: '/candidate/saved-jobs', label: 'Saved Jobs' },
];

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" strokeWidth="2" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M4 6h16v12H4z" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" strokeWidth="2" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        d="M22 16.9v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2.2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.1z"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" strokeWidth="2" />
    </svg>
  );
}

export const CandidateWorkspaceLayout: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const profileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await filesApi.uploadProfileImage(file);
      return candidateApi.updateProfile({ photoFileId: uploaded.id });
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: (open: boolean) =>
      candidateApi.updateProfile({ availabilityStatus: open ? 'open' : 'not_looking' }),
    onSuccess: () => {
      void invalidate();
    },
  });

  const profile = profileQuery.data;
  const percent = profile ? profileStrength(profile) : 0;
  const photoUrl = profile?.photoFileId ? publicFileUrl(profile.photoFileId) : null;
  const locationText = profile ? locationLine(profile) : '';
  const website = profile?.websiteUrl?.trim();
  const websiteLink = websiteHref(website);
  const openToWork = profile ? isOpenToOpportunities(profile) : true;
  const fullName = profile
    ? `${profile.user?.firstName ?? ''} ${profile.user?.lastName ?? ''}`.trim() || 'Your name'
    : 'Your profile';

  const openEdit = () => {
    const onProfile = location.pathname === '/candidate/profile';
    navigate('/candidate/profile?edit=1', { replace: onProfile });

    const scrollToEdit = (attempt = 0) => {
      const panel = document.getElementById('profile-edit');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const field = panel.querySelector<HTMLElement>('input, select, textarea');
        field?.focus({ preventScroll: true });
        return;
      }
      if (attempt < 30) {
        window.setTimeout(() => scrollToEdit(attempt + 1), 50);
      }
    };
    window.setTimeout(() => scrollToEdit(), onProfile ? 0 : 80);
  };

  const isListView =
    location.pathname.startsWith('/candidate/applications') ||
    location.pathname.startsWith('/candidate/saved-jobs');

  return (
    <div className={`profile-builder-page candidate-workspace${isListView ? ' is-list' : ''}`}>
      <section className="cw-banner" aria-label="Profile overview">
        {profileQuery.isError ? (
          <div className="cw-banner-error">
            Failed to load profile: {(profileQuery.error as Error).message}
          </div>
        ) : (
          <>
            <div className="cw-banner-top">
              <div className="cw-progress" aria-label={`${percent}% completed`}>
                <div className="cw-progress-track">
                  <div className="cw-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <span>{percent}% completed</span>
              </div>
              <button type="button" className="cw-edit" onClick={openEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M12 20h9" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="2" />
                </svg>
                Edit
              </button>
            </div>

            <div className="cw-banner-body">
              <div className="cw-avatar-wrap">
                <div className="cw-avatar">
                  {photoUrl ? (
                    <img src={photoUrl} alt={`${fullName} profile`} />
                  ) : (
                    <span>{fullName.charAt(0) || 'U'}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="cw-avatar-cam"
                  aria-label="Upload profile photo"
                  disabled={photoMutation.isPending}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="13" r="4" strokeWidth="2" />
                  </svg>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) photoMutation.mutate(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="cw-banner-main">
                <h1>{profileQuery.isLoading ? 'Loading…' : fullName}</h1>
                {profile?.gender ? <p className="cw-gender">{profile.gender}</p> : null}
              </div>

              <ul className="cw-facts cw-facts-contact">
                <li>
                  <IconPin />
                  <span>{displayOrFallback(locationText, 'Add your location')}</span>
                </li>
                <li>
                  <IconMail />
                  <span>{profile?.user?.email || 'Add your email'}</span>
                </li>
                <li>
                  <IconPhone />
                  <span>{displayOrFallback(profile?.user?.phone, 'Add your phone')}</span>
                </li>
                <li>
                  <IconGlobe />
                  {websiteLink ? (
                    <a href={websiteLink} target="_blank" rel="noreferrer">
                      {website}
                    </a>
                  ) : (
                    <span>Add a website</span>
                  )}
                </li>
              </ul>

              <ul className="cw-facts cw-facts-right">
                <li>
                  <span className="cw-fact-label">Profession</span>
                  <span>{displayOrFallback(profile?.headline)}</span>
                </li>
                <li>
                  <span className="cw-fact-label">Career Level</span>
                  <span>{profile ? experienceStageLabel(profile) : 'Not specified'}</span>
                </li>
                <li>
                  <span className="cw-fact-label">Managerial Exp.</span>
                  <span>{displayOrFallback(profile?.managerialExperience)}</span>
                </li>
              </ul>
            </div>

            <div className="cw-banner-foot">
              <button
                type="button"
                className={`cw-open-badge${openToWork ? ' is-on' : ''}`}
                disabled={availabilityMutation.isPending || !profile}
                onClick={() => availabilityMutation.mutate(!openToWork)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" />
                  <rect x="4" y="7" width="16" height="13" rx="2" strokeWidth="2" />
                </svg>
                <span className="cw-open-full">
                  {openToWork ? 'Open to New Opportunities' : 'Not currently looking'}
                </span>
                <span className="cw-open-short">
                  {openToWork ? 'Open to work' : 'Not looking'}
                </span>
              </button>
            </div>
          </>
        )}
      </section>

      <nav className="cw-tabs" aria-label="Candidate workspace">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/candidate/profile'}
            className={({ isActive }) => `cw-tab${isActive ? ' is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};
