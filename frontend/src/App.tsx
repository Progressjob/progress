import React from 'react';
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
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CandidateResumesPage } from './pages/CandidateResumesPage';
import { ApplyJobPage } from './pages/ApplyJobPage';
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage';
import { CompanyHomePage } from './pages/CompanyHomePage';
import { CompanyJobsPage } from './pages/CompanyJobsPage';
import { CompanyPostJobPage } from './pages/CompanyPostJobPage';
import { CompanyApplicationsPage } from './pages/CompanyApplicationsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminJobsPage } from './pages/AdminJobsPage';
import { AdminCompaniesPage } from './pages/AdminCompaniesPage';
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

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public & candidate site */}
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/jobs" element={<JobsListPage />} />
              <Route path="/jobs/:slug" element={<JobDetailPage />} />
              <Route
                path="/jobs/:slug/apply"
                element={
                  <RequireRole roles={['candidate']}>
                    <ApplyJobPage />
                  </RequireRole>
                }
              />
              <Route path="/companies" element={<CompaniesListPage />} />
              <Route path="/companies/:slug" element={<CompanyDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
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
                path="/candidate/profile"
                element={
                  <RequireRole roles={['candidate']}>
                    <CandidateProfilePage />
                  </RequireRole>
                }
              />
              <Route
                path="/candidate/resumes"
                element={
                  <RequireRole roles={['candidate']}>
                    <CandidateResumesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/candidate/applications"
                element={
                  <RequireRole roles={['candidate']}>
                    <CandidateApplicationsPage />
                  </RequireRole>
                }
              />
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
              <Route path="/admin/companies" element={<AdminCompaniesPage />} />
              <Route path="/admin/jobs" element={<AdminJobsPage />} />
              <Route path="/admin/candidates" element={<AdminCandidatesPage />} />
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
              <Route path="/company/:companyId/jobs" element={<CompanyJobsPage />} />
              <Route path="/company/:companyId/jobs/new" element={<CompanyPostJobPage />} />
              <Route
                path="/company/:companyId/jobs/:jobId/applications"
                element={<CompanyApplicationsPage />}
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
