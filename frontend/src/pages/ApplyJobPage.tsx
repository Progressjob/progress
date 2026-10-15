import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { jobsApi } from '../api/jobs';
import { candidateApi } from '../api/candidate';
import { ApiError } from '../api/client';
import type { ScreeningQuestion } from '../types/api';

export const ApplyJobPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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
    return <div className="card">Loading application form...</div>;
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="card alert-error">
        Could not load job: {(jobQuery.error as Error)?.message}
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
    <div className="narrow-container">
      <div>
        <Link to={`/jobs/${job.slug}`} className="muted">
          ← Back to {job.title}
        </Link>
      </div>

      <div className="page-header">
        <h1>Apply for {job.title}</h1>
        <p className="muted">
          Company: <strong>{job.company?.name}</strong> • Job UUID: <code>{job.id}</code>
        </p>
      </div>

      {job.applicationMethod !== 'internal' ? (
        <div className="card alert-error">
          This job uses <code>{job.applicationMethod}</code> applications and does not accept
          in-app submissions.
        </div>
      ) : (
        <div className="card">
          {err && (
            <div className="alert-error">
              <strong>Error ({err.status}):</strong> {err.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="apply-resume">Select CV / Resume (Optional if none uploaded)</label>
              <select
                id="apply-resume"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
              >
                <option value="">-- No Resume / Use None --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.file?.originalName ?? 'file'}) {r.isDefault ? '[Default]' : ''}
                  </option>
                ))}
              </select>
              <small className="muted">
                Need to upload a new CV? <Link to="/candidate/resumes">Manage CVs</Link>
              </small>
            </div>

            <div className="field">
              <label htmlFor="apply-cover">Cover Letter</label>
              <textarea
                id="apply-cover"
                rows={5}
                placeholder="Introduce yourself and explain why you're a great fit..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            {questions.length > 0 && (
              <div className="stack">
                <h3>Screening Questions</h3>
                {questions.map((q) => {
                  const val = answers[q.id] ?? '';
                  const opts = Array.isArray(q.options) ? q.options.map(String) : [];

                  return (
                    <div key={q.id} className="field">
                      <label>
                        {q.questionText}{' '}
                        {q.isRequired && <span className="req">*</span>}
                        <small className="muted"> ({q.questionType})</small>
                      </label>

                      {q.questionType === 'yes_no' ? (
                        <select
                          required={q.isRequired}
                          value={val}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                        >
                          <option value="">-- Select --</option>
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
                          placeholder={
                            q.questionType === 'multiple_choice' && opts.length
                              ? `Options: ${opts.join(', ')}`
                              : 'Your answer...'
                          }
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
            )}

            <button type="submit" className="btn" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
