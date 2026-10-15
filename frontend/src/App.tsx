import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { JobsListPage } from './pages/JobsListPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CompaniesListPage } from './pages/CompaniesListPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CandidateResumesPage } from './pages/CandidateResumesPage';
import { ApplyJobPage } from './pages/ApplyJobPage';
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage';
import { EmployerHomePage } from './pages/EmployerHomePage';
import { EmployerJobsPage } from './pages/EmployerJobsPage';
import { EmployerApplicationsPage } from './pages/EmployerApplicationsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminJobsPage } from './pages/AdminJobsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/jobs" replace />} />
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

              {/* Candidate routes */}
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

              {/* Employer routes */}
              <Route
                path="/employer"
                element={
                  <RequireRole roles={['employer']}>
                    <EmployerHomePage />
                  </RequireRole>
                }
              />
              <Route
                path="/employer/:companyId/jobs"
                element={
                  <RequireRole roles={['employer']}>
                    <EmployerJobsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/employer/:companyId/jobs/:jobId/applications"
                element={
                  <RequireRole roles={['employer']}>
                    <EmployerApplicationsPage />
                  </RequireRole>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['admin', 'moderator']}>
                    <AdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/jobs"
                element={
                  <RequireRole roles={['admin', 'moderator']}>
                    <AdminJobsPage />
                  </RequireRole>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
