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
    <div className="contact-page-container">
      {/* Header */}
      <div className="board-header">
        <span className="section-eyebrow">Direct Inquiries</span>
        <h1 className="board-title">Connect with Progress Manpower PLC</h1>
        <p className="board-subtitle">
          Whether you need certified technical workforce, executive recruitment, corporate training, or candidate support, our Dukem team is ready to assist.
        </p>
      </div>

      <div className="contact-split-grid">
        {/* Left Column: Corporate Office & Hotline Card */}
        <div className="contact-info-card">
          <div className="contact-brand-header">
            <h3>Headquarters & Regional Operations</h3>
            <p>Direct communication lines for employers, institutions, and candidates.</p>
          </div>

          <div className="contact-details-list">
            <div className="contact-detail-row">
              <div className="contact-icon-bubble">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" strokeWidth="2" />
                </svg>
              </div>
              <div className="contact-text-wrap">
                <strong>Corporate Headquarters</strong>
                <span>Dukem, Oromia Region, Ethiopia</span>
                <small>Serving the Adama & Bishoftu industrial corridor</small>
              </div>
            </div>

            <div className="contact-detail-row">
              <div className="contact-icon-bubble">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="contact-text-wrap">
                <strong>Telephone & Hotline</strong>
                <span>Office: +251 11 887 9710</span>
                <span>Mobile: +251 949 811 818 / +251 994 251 515</span>
              </div>
            </div>

            <div className="contact-detail-row">
              <div className="contact-icon-bubble">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                  <polyline points="22,6 12,13 2,6" strokeWidth="2" />
                </svg>
              </div>
              <div className="contact-text-wrap">
                <strong>Electronic Mail & Web</strong>
                <span>progressjobs8@gmail.com</span>
                <span>progressjobsplc.com</span>
              </div>
            </div>

            <div className="contact-detail-row">
              <div className="contact-icon-bubble">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                </svg>
              </div>
              <div className="contact-text-wrap">
                <strong>Working Hours (East Africa Time)</strong>
                <span>Monday – Friday: 8:30 AM – 5:30 PM</span>
                <span>Saturday: 8:30 AM – 12:30 PM</span>
              </div>
            </div>
          </div>

          <div className="contact-accreditation-badge">
            <span className="shield-icon">🛡️</span>
            <span>Licensed, certified and registered by O/R/ G/Labor & Social Affairs Bureau</span>
          </div>
        </div>

        {/* Right Column: Interactive Inquiry Form */}
        <div className="contact-form-card">
          <h3>Send an Official Message</h3>
          <p className="form-subtext">Our placement and enterprise consultants reply within 24 hours.</p>

          {submitted && (
            <div className="alert-box-success">
              ✓ Thank you! Your message has been received. Our team will contact you shortly.
            </div>
          )}

          {err && (
            <div className="alert-box-error">
              {err.status === 429
                ? 'Rate limit reached: Please wait a moment before sending another message.'
                : err.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form-fields">
            <div className="form-input-group">
              <label htmlFor="contact-name">Full Name *</label>
              <input
                id="contact-name"
                type="text"
                required
                placeholder="Abebe Kebede"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="contact-email">Email Address *</label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="abebe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="contact-subject">Inquiry Subject *</label>
              <input
                id="contact-subject"
                type="text"
                required
                placeholder="e.g. Manpower Supply for Industrial Facility / Candidate Query"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="contact-message">Detailed Message *</label>
              <textarea
                id="contact-message"
                rows={5}
                required
                placeholder="Please describe your workforce requirements, timeline, or candidate inquiry in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-submit-message" disabled={mutation.isPending}>
              {mutation.isPending ? 'Transmitting...' : 'Send Message →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
