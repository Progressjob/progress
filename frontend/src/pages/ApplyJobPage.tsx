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

  const resumes = resumesQuery.data ?? [];
  /** Apply form only offers the current profile CV (default), not upload history. */
  const profileResume = useMemo(
    () => resumes.find((r) => r.isDefault) ?? resumes[0] ?? null,
    [resumes],
  );

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

  if (jobQuery.isLoading || profileQuery.isLoading) {
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

  const job = jobQuery.data;
  const profile = profileQuery.data;
  const firstName = user.firstName || profile?.user?.firstName || '';
  const lastName = user.lastName || profile?.user?.lastName || '';
  const email = user.email || profile?.user?.email || '';
  const questions = job.screeningQuestions ?? [];
  const canSubmit = Boolean(resumeId) && isValidEthiopianMobile(phone);

  return (
    <div className="job-detail-page">
      <div className="job-detail-container" style={{ maxWidth: 720 }}>
        <BackButton fallback={`/jobs/${slug}`} />

        <header style={{ marginBottom: '1.5rem' }}>
          <p className="muted" style={{ margin: '0 0 0.35rem' }}>
            {job.company?.name ?? 'Employer'}
          </p>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Start your application</h1>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            Applying for <strong>{job.title}</strong>
          </p>
        </header>

        <form
          className="pb-card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            applyMutation.mutate();
          }}
        >
          {formError && <div className="alert-error">{formError}</div>}

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
              />
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
              className="et-upload-zone apply-cv-upload"
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
                    value={answers[q.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-jd-apply-main"
            disabled={applyMutation.isPending || uploadMutation.isPending || !canSubmit}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {applyMutation.isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};
