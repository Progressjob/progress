import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { candidateApi } from '../api/candidate';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CandidateApplicationsBlockedNotice } from '../components/CandidateApplicationsBlockedNotice';
import type { ScreeningQuestion } from '../types/api';

export const ApplyJobPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const applicationsBlocked =
    user?.applicationsBlocked === true || user?.accountStatus === 'suspended';

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.detail(slug!, 'apply_page'),
    enabled: Boolean(slug),
  });

  const resumesQuery = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: () => candidateApi.listResumes(),
  });

  const [resumeId, setResumeId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resumesQuery.data && resumesQuery.data.length > 0 && !resumeId) {
      const def = resumesQuery.data.find((r) => r.isDefault) ?? resumesQuery.data[0];
      if (def) setResumeId(def.id);
    }
  }, [resumesQuery.data, resumeId]);

  const applyMutation = useMutation({
    mutationFn: () => {
      const job = jobQuery.data!;
      const questions = job.screeningQuestions ?? [];
      const formattedAnswers = questions
        .map((q) => ({
          questionId: q.id,
          answerText: (answers[q.id] ?? '').trim(),
        }))
        .filter((a) => a.answerText.length > 0);

      return candidateApi.applyToJob(job.id, {
        resumeId: resumeId || undefined,
        coverLetter: coverLetter.trim() || undefined,
        answers: formattedAnswers,
      });
    },
    onSuccess: () => {
      navigate('/candidate/applications');
    },
  });

  if (jobQuery.isLoading) {
    return (
      <div className="jobs-list-container">
        <div className="job-card-skeleton" style={{ minHeight: '300px' }} />
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="jobs-list-container">
        <div className="alert-box-error">
          Could not load vacancy details: {(jobQuery.error as Error)?.message}
        </div>
      </div>
    );
  }

  const job = jobQuery.data;
  const resumes = resumesQuery.data ?? [];
  const questions: ScreeningQuestion[] = job.screeningQuestions ?? [];
  const err = applyMutation.error as ApiError | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate();
  };

  return (
    <div className="jobs-list-container" style={{ maxWidth: '820px' }}>
      <nav className="detail-breadcrumbs" style={{ marginBottom: '1.5rem' }}>
        <Link to={`/jobs/${job.slug}`}>← Back to {job.title}</Link>
      </nav>

      <div className="board-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <span className="section-eyebrow">Direct Application</span>
        <h1 className="board-title" style={{ margin: '0.25rem 0' }}>Apply for {job.title}</h1>
        <p className="board-subtitle" style={{ margin: 0, textAlign: 'left' }}>
          Submitting to <strong>{job.company?.name ?? 'Progress Partner Employer'}</strong> • Verified Vacancy
        </p>
      </div>

      {applicationsBlocked ? (
        <CandidateApplicationsBlockedNotice />
      ) : job.applicationMethod !== 'internal' ? (
        <div className="alert-box-error">
          This position accepts applications through external portals and does not process direct platform submissions.
        </div>
      ) : (
        <div className="jobs-filter-card" style={{ padding: '2.5rem' }}>
          {err && (
            <div className="alert-box-error">
              <strong>Error:</strong> {err.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form-fields">
            {/* Resume Selection */}
            <div className="form-input-group">
              <label htmlFor="apply-resume">Select Curriculum Vitae (CV) *</label>
              <select
                id="apply-resume"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- No Attached CV (Submit Profile Only) --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.file?.originalName ?? 'Uploaded CV'}) {r.isDefault ? '[Default]' : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                Need to upload a newly updated CV?{' '}
                <Link to="/candidate/resumes" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Manage Candidate CVs →
                </Link>
              </span>
            </div>

            {/* Cover Letter */}
            <div className="form-input-group">
              <label htmlFor="apply-cover">Candidate Cover Statement (Optional)</label>
              <textarea
                id="apply-cover"
                rows={5}
                placeholder="Highlight your relevant experience, technical competencies, and why you are the ideal fit for this role..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            {/* Screening Questions */}
            {questions.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0a2540', marginBottom: '1.25rem' }}>
                  Employer Screening Questions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {questions.map((q) => {
                    const val = answers[q.id] ?? '';
                    const opts = Array.isArray(q.options) ? q.options.map(String) : [];

                    return (
                      <div key={q.id} className="form-input-group">
                        <label>
                          {q.questionText} {q.isRequired && <span style={{ color: '#dc2626' }}>*</span>}
                        </label>

                        {q.questionType === 'yes_no' ? (
                          <select
                            required={q.isRequired}
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="">-- Select Answer --</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : q.questionType === 'single_choice' && opts.length > 0 ? (
                          <select
                            required={q.isRequired}
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="">-- Select Option --</option>
                            {opts.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : q.questionType === 'number' ? (
                          <input
                            type="number"
                            required={q.isRequired}
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            required={q.isRequired}
                            placeholder="Your answer..."
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={applyMutation.isPending}
              style={{ marginTop: '1.5rem' }}
            >
              {applyMutation.isPending ? 'Transmitting Application...' : 'Submit Application to Employer →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
