import { AdminVerificationPage } from './pages/AdminVerificationPage';
import { AdminSupportPage } from './pages/AdminSupportPage';
import { AdminReportDetailPage } from './pages/AdminReportDetailPage';
import { NotificationsPage } from './pages/NotificationsPage';
import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { AdminPortalLayout } from './components/AdminPortalLayout';
import { CompanyPortalLayout } from './components/CompanyPortalLayout';
import { RequireRole, RequireSignedIn } from './components/RequireRole';
import { LandingPage } from './pages/LandingPage';
import { JobsListPage } from './pages/JobsListPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CompaniesListPage } from './pages/CompaniesListPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EmployerSetupPage } from './pages/EmployerSetupPage';
import { CandidateWorkspaceLayout } from './components/CandidateWorkspaceLayout';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage';
import { CandidateSavedJobsPage } from './pages/CandidateSavedJobsPage';
import { ApplyJobPage } from './pages/ApplyJobPage';
import { CompanyHomePage } from './pages/CompanyHomePage';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { CompanyJobsPage } from './pages/CompanyJobsPage';
import { CompanyPostJobPage } from './pages/CompanyPostJobPage';
import { CompanyCvSearchPage } from './pages/CompanyCvSearchPage';
import { CompanyCvDetailPage } from './pages/CompanyCvDetailPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminJobsPage } from './pages/AdminJobsPage';
import { AdminJobDetailPage } from './pages/AdminJobDetailPage';
import { AdminCompaniesPage } from './pages/AdminCompaniesPage';
import { AdminTaxonomyPage } from './pages/AdminTaxonomyPage';
import { AdminCandidatesPage } from './pages/AdminCandidatesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function EmployerLegacyRedirect(): React.ReactElement {
  const location = useLocation();
  const target = location.pathname.replace(/^\/employer/, '/company') + location.search;
  return <Navigate to={target} replace />;
}

function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public & candidate site */}
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/jobs" element={<JobsListPage />} />
              <Route path="/jobs/:slug" element={<JobDetailPage />} />
              <Route path="/jobs/:slug/apply" element={<ApplyJobPage />} />
              <Route path="/companies" element={<CompaniesListPage />} />
              <Route path="/companies/:slug" element={<CompanyDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/notifications" element={<RequireSignedIn><NotificationsPage /></RequireSignedIn>} />
              <Route
                path="/cv-search"
                element={
                  <RequireSignedIn>
                    <CompanyCvSearchPage />
                  </RequireSignedIn>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/employer/setup"
                element={
                  <RequireSignedIn>
                    <EmployerSetupPage />
                  </RequireSignedIn>
                }
              />

              <Route
                element={
                  <RequireRole roles={['candidate']}>
                    <CandidateWorkspaceLayout />
                  </RequireRole>
                }
              >
                <Route path="/candidate/profile" element={<CandidateProfilePage />} />
                <Route path="/candidate/applications" element={<CandidateApplicationsPage />} />
                <Route path="/candidate/saved-jobs" element={<CandidateSavedJobsPage />} />
              </Route>
              <Route path="/candidate/resumes" element={<Navigate to="/candidate/profile" replace />} />
            </Route>

            {/* Admin portal */}
            <Route
              element={
                <RequireRole roles={['admin', 'moderator']}>
                  <AdminPortalLayout />
                </RequireRole>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/verification" element={<AdminVerificationPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route path="/admin/support/reports/:reportId" element={<AdminReportDetailPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/companies" element={<AdminCompaniesPage />} />
              <Route path="/admin/jobs" element={<AdminJobsPage />} />
              <Route path="/admin/jobs/:jobId" element={<AdminJobDetailPage />} />
              <Route path="/admin/candidates" element={<AdminCandidatesPage />} />
              <Route path="/admin/taxonomy" element={<AdminTaxonomyPage />} />
              <Route path="/admin/cv-search" element={<CompanyCvSearchPage />} />
              <Route path="/admin/cv-search/:candidateId" element={<CompanyCvDetailPage />} />
            </Route>

            {/* Employer (hiring) portal */}
            <Route
              element={
                <RequireRole roles={['employer']}>
                  <CompanyPortalLayout />
                </RequireRole>
              }
            >
              <Route path="/company" element={<CompanyHomePage />} />
              <Route path="/company/:companyId/profile" element={<CompanyProfilePage />} />
              <Route path="/company/:companyId/jobs" element={<CompanyJobsPage />} />
              <Route path="/company/:companyId/jobs/new" element={<CompanyPostJobPage />} />
              <Route path="/company/:companyId/jobs/:jobId/edit" element={<CompanyPostJobPage />} />
              <Route path="/company/:companyId/cv-search" element={<CompanyCvSearchPage />} />
              <Route
                path="/company/:companyId/cv-search/:candidateId"
                element={<CompanyCvDetailPage />}
              />
            </Route>

            <Route path="/employer/*" element={<EmployerLegacyRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
