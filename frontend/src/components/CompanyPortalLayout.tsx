import { MenuNotificationBadge } from './MenuNotificationBadge';
import { SiteNavbar } from './SiteNavbar';
import { AccountDropdown } from './AccountDropdown';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  isCompanyCvSearch,
  isCompanyEditJob,
  isCompanyJobsList,
  isCompanyPostJob,
  isCompanyReviewCandidates,
  isExactPath,
  navActive,
} from '../auth/nav';
import { employerHomeDestination, employerProfileEditPath } from '../auth/workspace';
import { employerApi } from '../api/employer';
import { notificationsApi } from '../api/notifications';
import { AdminContactCard } from './AdminContactCard';
import { WorkspaceSwitch } from './WorkspaceSwitch';

export const CompanyPortalLayout: React.FC = () => {
  const { user, logout, setWorkspace, enableCandidate, hasRole, workspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams<{ companyId?: string }>();
  const [switching, setSwitching] = useState(false);

  const companiesQuery = useQuery({
    queryKey: ['company', 'memberships'],
    queryFn: () => employerApi.listCompanies(),
  });

  const companyQuery = useQuery({
    queryKey: ['company', 'detail', companyId],
    queryFn: () => employerApi.getCompany(companyId!),
    enabled: Boolean(companyId),
  });

  const jobsQuery = useQuery({
    queryKey: ['company', 'jobs', companyId],
    queryFn: () => employerApi.listJobs(companyId!),
    enabled: Boolean(companyId),
    refetchInterval: 30_000,
  });

  const reviewUnreadQuery = useQuery({
    queryKey: ['notifications', user?.id, 'unread', 'candidates', companyId],
    queryFn: () =>
      notificationsApi.unread({
        referenceType: 'candidates',
        referenceId: companyId!,
      }),
    enabled: Boolean(user && companyId),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setWorkspace('employer');
  }, [setWorkspace]);

  const companies = companiesQuery.data ?? [];
  const company = companyQuery.data;
  const jobs = jobsQuery.data ?? [];
  const reviewUnreadCount = reviewUnreadQuery.data ?? 0;

  const showAdminContact = useMemo(() => {
    if (companiesQuery.isLoading) return false;
    if (companies.length === 0) return false;
    if (company?.verificationStatus === 'rejected') return true;
    return jobs.some((j) => j.status === 'rejected');
  }, [companies.length, companiesQuery.isLoading, company, jobs]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: {} });
  };

  const hasBothAccounts = Boolean(user && hasRole('candidate') && hasRole('employer'));
  const employerCompanyId = companyId ?? companies[0]?.id ?? user?.companyMemberships[0]?.companyId;

  const handleFindWork = async () => {
    setSwitching(true);
    try {
      if (!user?.roles.includes('candidate')) {
        await enableCandidate();
      }
      setWorkspace('candidate');
      navigate('/jobs');
    } finally {
      setSwitching(false);
    }
  };

  const switchToCandidate = () => {
    setWorkspace('candidate');
    navigate('/jobs');
  };

  const switchToEmployer = () => {
    setWorkspace('employer');
    navigate(employerHomeDestination(employerCompanyId));
  };

  return (
    <div className="app-shell employer-workspace">
      <SiteNavbar label="Employer navigation" account={<>
            {user && (
              <>
                {hasBothAccounts && (
                  <WorkspaceSwitch
                    workspace={workspace}
                    onToggle={workspace === 'employer' ? switchToCandidate : switchToEmployer}
                  />
                )}
                <AccountDropdown name={`${user.firstName} ${user.lastName}`} subtitle="Employer account">
                  <p className="nav-account-heading">Hiring workspace</p>
                  <NavLink to={companyId ? employerProfileEditPath(companyId) : companies[0] ? employerProfileEditPath(companies[0].id) : '/employer/setup'}>Company profile</NavLink>
                  <NavLink className="employer-account-duplicate" to={companyId ? `/company/${companyId}/jobs` : '/company'}>Manage posted jobs</NavLink>
                  {hasRole('candidate') && (
                    <NavLink to="/candidate/saved-jobs" onClick={() => setWorkspace('candidate')}>Saved jobs</NavLink>
                  )}
                  <Link className="employer-account-duplicate" to="/">Homepage</Link>
                  <Link to="/contact">Contact support</Link>
                  <div className="nav-account-separator" />
                  <button type="button" onClick={() => void handleFindWork()} disabled={switching}>
                    {switching ? 'Switching…' : 'Switch to finding work'}
                  </button>
                  <button type="button" className="nav-account-logout" onClick={handleLogout}>Sign out</button>
                </AccountDropdown>
              </>
            )}
      </>}>
            <NavLink to="/">Home</NavLink>
            {companyId ? (
              <>
                <NavLink
                  to={`/company/${companyId}/jobs`}
                  end
                  className={() =>
                    navActive(
                      isCompanyJobsList(location.pathname, companyId) ||
                        isCompanyEditJob(location.pathname, companyId),
                    )
                  }
                >
                  Job postings
                </NavLink>
                <NavLink
                  to={`/company/${companyId}/jobs/new`}
                  end
                  className={() => navActive(isCompanyPostJob(location.pathname, companyId))}
                >
                  Post a job
                </NavLink>
                <NavLink
                  to={`/company/${companyId}/candidates`}
                  className={() => navActive(isCompanyReviewCandidates(location.pathname, companyId))}
                >
                  Review candidates<MenuNotificationBadge references={['candidates']} />
                  {reviewUnreadCount > 0 && (
                    <span
                      className="nav-count-badge"
                      aria-label={`${reviewUnreadCount} new applicant notifications`}
                    >
                      {reviewUnreadCount > 99 ? '99+' : reviewUnreadCount}
                    </span>
                  )}
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/company"
                end
                className={() => navActive(isExactPath(location.pathname, '/company'))}
              >
                Hiring home
              </NavLink>
            )}
            <NavLink
              to={
                companyId
                  ? `/company/${companyId}/cv-search`
                  : companies[0]
                    ? `/company/${companies[0].id}/cv-search`
                    : '/company'
              }
              className={() => navActive(isCompanyCvSearch(location.pathname, companyId))}
            >
              CV search
            </NavLink>

      </SiteNavbar>

      <main className="main-container">
        <Outlet />
        {showAdminContact && <AdminContactCard />}
      </main>

      <footer className="site-footer" style={{ padding: '1rem 2rem' }}>
        <p style={{ margin: 0, textAlign: 'center', opacity: 0.85 }}>
          © {new Date().getFullYear()} Progress Jobs — Employer
        </p>
      </footer>
    </div>
  );
};
