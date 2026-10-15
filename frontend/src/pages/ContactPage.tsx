import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supportApi } from '../api/support';
import { ApiError } from '../api/client';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => supportApi.contact({ name, email, subject, message }),
    onSuccess: () => {
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(false);
    mutation.mutate();
  };

  const err = mutation.error as ApiError | null;

  return (
    <div className="narrow-container">
      <div className="page-header">
        <h1>Contact Support</h1>
        <p className="muted">Send a message to the platform administrators (POST /api/v1/contact).</p>
      </div>

      <div className="card">
        {submitted && (
          <div className="alert-success">
            Thank you! Your message has been submitted to support.
          </div>
        )}

        {err && (
          <div className="alert-error">
            {err.status === 429
              ? 'Rate limit reached (429): Please wait a minute before sending another message.'
              : err.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="contact-name">Your Name *</label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="contact-email">Your Email *</label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="contact-subject">Subject *</label>
            <input
              id="contact-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="contact-message">Message *</label>
            <textarea
              id="contact-message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};
