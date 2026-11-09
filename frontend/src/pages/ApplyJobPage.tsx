import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { jobsApi } from '../api/jobs';
import { useAuth } from '../auth/AuthContext';
import { BackButton } from '../components/BackButton';
import { CandidateApplicationsBlockedNotice } from '../components/CandidateApplicationsBlockedNotice';
import { EthiopianPhoneInput } from '../components/EthiopianPhoneInput';
import type { CandidateResume } from '../types/api';
import {
  applicationStatusBadgeClass,
  applicationStatusLabel,
  canReapplyExistingApplication,
} from '../utils/applicationStatus';
import {
  isValidEthiopianMobile,
  toEthiopianE164,
  toEthiopianLocalDigits,
} from '../utils/ethiopianPhone';

const MAX_CV_BYTES = 5 * 1024 * 1024;

function isCvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
}

export const ApplyJobPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [coverLetter, setCoverLetter] = useState('');
  const [phone, setPhone] = useState('');
  const [resumeId, setResumeId] = useState<string>('');
  const [uploadedLabel, setUploadedLabel] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneReady, setPhoneReady] = useState(false);

  const applyPath = slug ? `/jobs/${slug}/apply` : '/jobs';

  const jobQuery = useQuery({
    queryKey: ['jobs', slug],
    queryFn: () => jobsApi.detail(slug!),
    enabled: Boolean(slug),
  });

  const profileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
    enabled: Boolean(user && hasRole('candidate')),
  });

  const resumesQuery = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: () => candidateApi.listResumes(),
    enabled: Boolean(user && hasRole('candidate')),
  });

  const applicationsQuery = useQuery({
    queryKey: ['candidate', 'applications'],
    queryFn: () => candidateApi.listApplications(),
    enabled: Boolean(user && hasRole('candidate')),
  });

  const existingForJob = useMemo(() => {
    const jobId = jobQuery.data?.id;
    if (!jobId) return null;
    return applicationsQuery.data?.find((a) => a.jobId === jobId) ?? null;
  }, [applicationsQuery.data, jobQuery.data?.id]);

  const isReapply = Boolean(
    existingForJob &&
      jobQuery.data &&
      canReapplyExistingApplication(existingForJob, jobQuery.data),
  );

  const existingDetailQuery = useQuery({
    queryKey: ['candidate', 'applications', existingForJob?.id],
    queryFn: () => candidateApi.getApplication(existingForJob!.id),
    enabled: Boolean(existingForJob?.id && existingForJob.status === 'rejected'),
  });

  const resumes = resumesQuery.data ?? [];
  /** Apply form only offers the current profile CV (default), not upload history. */
  const profileResume = useMemo(
    () => resumes.find((r) => r.isDefault) ?? resumes[0] ?? null,
    [resumes],
  );

  const activeApplication =
    existingForJob && !isReapply ? existingForJob : null;
  const rejectionReason = useMemo(() => {
    const events = existingDetailQuery.data?.events;
    if (!events?.length) return null;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (event.newStatus === 'rejected' && event.note?.trim()) {
        return event.note.trim();
      }
    }
    return null;
  }, [existingDetailQuery.data?.events]);

  useEffect(() => {
    if (!resumeId && profileResume) setResumeId(profileResume.id);
  }, [profileResume, resumeId]);

  useEffect(() => {
    if (phoneReady) return;
    const fromProfile = profileQuery.data?.user?.phone || user?.phone || '';
    if (fromProfile || profileQuery.isSuccess) {
      setPhone(toEthiopianE164(fromProfile) ?? toEthiopianLocalDigits(fromProfile));
      setPhoneReady(true);
    }
  }, [phoneReady, profileQuery.data?.user?.phone, profileQuery.isSuccess, user?.phone]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!isCvFile(file)) throw new Error('Please upload a PDF, DOC, or DOCX file.');
      if (file.size > MAX_CV_BYTES) throw new Error('CV must be 5 MB or smaller.');
      const resume = await candidateApi.uploadResume(
        file,
        file.name.replace(/\.[^.]+$/, '') || 'Resume',
      );
      // Make this the profile CV so apply UI stays “one CV”, not a history list.
      await candidateApi.setDefaultResume(resume.id);
      return resume;
    },
    onSuccess: (resume) => {
      queryClient.setQueryData<CandidateResume[]>(['candidate', 'resumes'], (prev) => {
        const list = (prev ?? []).map((item) => ({ ...item, isDefault: item.id === resume.id }));
        if (list.some((item) => item.id === resume.id)) {
          return list.map((item) =>
            item.id === resume.id ? { ...resume, isDefault: true } : { ...item, isDefault: false },
          );
        }
        return [{ ...resume, isDefault: true }, ...list.map((item) => ({ ...item, isDefault: false }))];
      });
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
      setResumeId(resume.id);
      setUploadedLabel(resume.title || 'Resume uploaded');
      setFormError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const job = jobQuery.data;
      if (!job) throw new Error('Job not found');
      if (!resumeId) throw new Error('Please upload or select a resume / CV.');

      const e164 = toEthiopianE164(phone);
      if (!e164) {
        throw new Error('Enter a valid Ethiopian mobile number (9 digits starting with 7 or 9).');
      }

      const currentPhone = profileQuery.data?.user?.phone || user?.phone || '';
      if (toEthiopianE164(currentPhone) !== e164) {
        await candidateApi.updateProfile({ phone: e164 });
        await refreshUser();
        void queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] });
      }

      const screening = job.screeningQuestions ?? [];
      const payloadAnswers = screening.map((q) => ({
        questionId: q.id,
        answerText: (answers[q.id] ?? '').trim(),
      }));
      for (const q of screening) {
        if (q.isRequired && !payloadAnswers.find((a) => a.questionId === q.id)?.answerText) {
          throw new Error(`Please answer: ${q.questionText}`);
        }
      }
      return candidateApi.applyToJob(job.id, {
        resumeId,
        coverLetter: coverLetter.trim() || undefined,
        answers: payloadAnswers,
      });
    },
    onSuccess: (application) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'applications'] });
      navigate(`/candidate/applications/${application.id}`);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  if (!slug) return <Navigate to="/jobs" replace />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: applyPath }} />;
  }

  if (!hasRole('candidate')) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <BackButton fallback={slug ? `/jobs/${slug}` : '/jobs'} />
          <div className="pb-card">
            <p>Sign in with a candidate account to apply through Progress.</p>
            <Link to="/login" state={{ from: applyPath }} className="btn">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.applicationsBlocked) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <BackButton fallback={`/jobs/${slug}`} />
          <CandidateApplicationsBlockedNotice />
        </div>
      </div>
    );
  }

  if (jobQuery.isLoading || profileQuery.isLoading || applicationsQuery.isLoading) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <div className="pb-card">Loading application form…</div>
        </div>
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container">
          <BackButton fallback="/jobs" />
          <div className="pb-card alert-error">
            {(jobQuery.error as Error)?.message ?? 'Job not found'}
          </div>
        </div>
      </div>
    );
  }

  if (activeApplication) {
    const hired = activeApplication.status === 'hired';
    return (
      <div className="job-detail-page">
        <div className="job-detail-container" style={{ maxWidth: 720 }}>
          <BackButton fallback={`/jobs/${slug}`} />
          <div className="pb-card stack">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
                {hired ? 'You were hired' : 'Already applied'}
              </h1>
              <span className={applicationStatusBadgeClass(activeApplication.status)}>
                {applicationStatusLabel(activeApplication.status)}
              </span>
            </div>
            <p style={{ margin: 0 }}>
              {hired
                ? 'This vacancy already shows you as hired. If the employer republishes the role, you can apply again.'
                : `You already have an application for this vacancy (status: ${applicationStatusLabel(activeApplication.status)}).`}
            </p>
            <Link to={`/candidate/applications/${activeApplication.id}`} className="btn btn-sm">
              View application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const job = jobQuery.data;
  const profile = profileQuery.data;
  const firstName = user.firstName || profile?.user?.firstName || '';
  const lastName = user.lastName || profile?.user?.lastName || '';
  const email = user.email || profile?.user?.email || '';
  const questions = job.screeningQuestions ?? [];
  const fieldErrors: Record<string, string> = {};
  if (!isValidEthiopianMobile(phone)) fieldErrors['apply-phone'] = 'Enter 9 digits starting with 7 or 9.';
  if (!resumeId) fieldErrors['apply-cv-upload'] = 'Upload or select your CV.';
  for (const question of questions) {
    if (question.isRequired && !(answers[question.id] ?? '').trim()) {
      fieldErrors[`q-${question.id}`] = 'This answer is required.';
    }
  }

  if (job.status === 'closed') {
    return (
      <div className="job-detail-page">
        <div className="job-detail-container" style={{ maxWidth: 720 }}>
          <BackButton fallback={`/jobs/${slug}`} />
          <div className="pb-card stack">
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Vacancy closed</h1>
            <p style={{ margin: 0 }}>
              This position is no longer accepting applications.
            </p>
            <Link to={`/jobs/${slug}`} className="btn btn-sm">
              View vacancy
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-detail-page">
      <div className="job-detail-container" style={{ maxWidth: 720 }}>
        <BackButton fallback={`/jobs/${slug}`} />

        <header style={{ marginBottom: '1.5rem' }}>
          <p className="muted" style={{ margin: '0 0 0.35rem' }}>
            {job.company?.name ?? 'Employer'}
          </p>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>
            {isReapply ? 'Reapply for this role' : 'Start your application'}
          </h1>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            {isReapply ? 'Resubmitting for' : 'Applying for'} <strong>{job.title}</strong>
          </p>
        </header>

        {isReapply && existingForJob?.status === 'hired' && (
          <div className="pb-card stack" style={{ marginBottom: '1rem' }}>
            <h3 className="pb-card-title" style={{ margin: 0 }}>
              Vacancy republished
            </h3>
            <p style={{ margin: 0 }}>
              You were previously hired on an earlier posting of this role. The employer
              republished it — submit a new application below.
            </p>
          </div>
        )}

        {isReapply && existingForJob?.status === 'rejected' && (
          <div className="pb-card stack" style={{ marginBottom: '1rem' }}>
            <h3 className="pb-card-title" style={{ margin: 0 }}>
              Previously rejected
            </h3>
            {rejectionReason ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                <strong>Reason:</strong> {rejectionReason}
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                The employer rejected your earlier application for this vacancy.
              </p>
            )}
            <p style={{ margin: 0 }}>
              Update your CV or cover letter if needed, then resubmit so the employer can review
              again.
            </p>
            <Link to="/candidate/profile?edit=1" className="apps-text-link">
              Update profile
            </Link>
          </div>
        )}

        <form
          noValidate
          className="pb-card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitAttempted(true);
            setFormError(null);
            const firstInvalid = Object.keys(fieldErrors)[0];
            if (firstInvalid) {
              document.getElementById(firstInvalid)?.focus();
              document.getElementById(firstInvalid)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              return;
            }
            applyMutation.mutate();
          }}
        >
          {submitAttempted && Object.keys(fieldErrors).length > 0 && (
            <div className="alert-error" role="alert">Please complete the highlighted fields below.</div>
          )}
          {formError && <div className="alert-error" role="alert">{formError}</div>}

          <div className="grid-two">
            <div className="profile-field-wrap">
              <label htmlFor="apply-first-name">First Name</label>
              <input id="apply-first-name" value={firstName} readOnly />
            </div>
            <div className="profile-field-wrap">
              <label htmlFor="apply-last-name">Middle / Last Name</label>
              <input id="apply-last-name" value={lastName} readOnly />
            </div>
          </div>

          <div className="grid-two">
            <div className="profile-field-wrap">
              <label htmlFor="apply-phone">
                Phone Number <span className="profile-field-req">*</span>
              </label>
              <EthiopianPhoneInput
                id="apply-phone"
                value={phone}
                onChange={setPhone}
                required
                inputClassName={submitAttempted && fieldErrors['apply-phone'] ? 'apply-field-invalid' : ''}
                aria-invalid={submitAttempted && Boolean(fieldErrors['apply-phone'])}
                aria-describedby={submitAttempted && fieldErrors['apply-phone'] ? 'apply-phone-error' : undefined}
              />
              {submitAttempted && fieldErrors['apply-phone'] && <p id="apply-phone-error" className="apply-field-error">{fieldErrors['apply-phone']}</p>}
            </div>
            <div className="profile-field-wrap">
              <label htmlFor="apply-email">Email Address</label>
              <input id="apply-email" value={email} readOnly />
            </div>
          </div>

          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Name and email come from your Progress profile. Phone is saved to your profile when you
            submit.{' '}
            <Link to="/candidate/profile?edit=1">Update profile</Link>
          </p>

          <fieldset className="apply-cv-block">
            <legend className="apply-cv-legend">
              Resume / CV <span className="profile-field-req">*</span>
            </legend>
            <p className="apply-cv-hint">
              {profileResume
                ? 'Use the CV saved on your Progress profile, or replace it by uploading a new file for this application.'
                : 'Upload a CV to continue. It will be saved as your Progress profile CV.'}
            </p>

            {profileResume && (
              <div
                className={`apply-cv-option is-selected`}
                aria-label="Profile CV selected"
              >
                <span className="apply-cv-check" aria-hidden="true">
                  ✓
                </span>
                <span className="apply-cv-option-copy">
                  <strong>{profileResume.title}</strong>
                  <small>
                    {uploadedLabel ? 'New upload — now your profile CV' : 'Your current profile CV'}
                  </small>
                </span>
              </div>
            )}

            <div className="apply-cv-divider">
              <span>{profileResume ? 'Or replace with a new upload' : 'Upload your CV'}</span>
            </div>

            <button
              type="button"
              id="apply-cv-upload"
              aria-invalid={submitAttempted && Boolean(fieldErrors['apply-cv-upload'])}
              aria-describedby={submitAttempted && fieldErrors['apply-cv-upload'] ? 'apply-cv-error' : undefined}
              className={`et-upload-zone apply-cv-upload${submitAttempted && !resumeId ? ' apply-field-invalid' : ''}`}
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <strong>
                {uploadMutation.isPending
                  ? 'Uploading…'
                  : profileResume
                    ? 'Upload a new CV'
                    : 'Upload CV'}
              </strong>
              <span>
                PDF, DOC, or DOCX — max 5 MB. This becomes your profile CV and is used for this
                application.
              </span>
            </button>
            {submitAttempted && !resumeId && <p id="apply-cv-error" className="apply-field-error">Upload or select your CV.</p>}
            {uploadedLabel && (
              <p className="apply-cv-success">Using new CV: {uploadedLabel}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFormError(null);
                uploadMutation.mutate(file);
              }}
            />
          </fieldset>

          <div className="profile-field-wrap">
            <label htmlFor="apply-cover">Short Introduction / Cover Letter</label>
            <textarea
              id="apply-cover"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell us why you're a great fit for this role..."
            />
          </div>

          {questions.length > 0 && (
            <div className="stack">
              <h3 style={{ margin: 0 }}>Screening questions</h3>
              {questions.map((q) => (
                <div key={q.id} className="profile-field-wrap">
                  <label htmlFor={`q-${q.id}`}>
                    {q.questionText}
                    {q.isRequired ? <span className="profile-field-req"> *</span> : null}
                  </label>
                  <textarea
                    id={`q-${q.id}`}
                    rows={3}
                    required={q.isRequired}
                    aria-invalid={submitAttempted && Boolean(fieldErrors[`q-${q.id}`])}
                    aria-describedby={submitAttempted && fieldErrors[`q-${q.id}`] ? `q-error-${q.id}` : undefined}
                    className={submitAttempted && fieldErrors[`q-${q.id}`] ? 'apply-field-invalid' : ''}
                    value={answers[q.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                  {submitAttempted && fieldErrors[`q-${q.id}`] && <p id={`q-error-${q.id}`} className="apply-field-error">This answer is required.</p>}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-jd-apply-main"
            disabled={applyMutation.isPending || uploadMutation.isPending}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {applyMutation.isPending
              ? isReapply
                ? 'Resubmitting…'
                : 'Submitting…'
              : isReapply
                ? 'Resubmit application'
                : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};
