import React from 'react';
import { Link } from 'react-router-dom';
import {
  PROGRESS_HIRE_EMAIL,
  PROGRESS_HQ_LOCATION,
  PROGRESS_MOBILE_PHONES,
  PROGRESS_OFFICE_PHONE,
} from '../constants/progressContact';

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

/** Full-page wall when admin has blocked a candidate from viewing/applying to jobs. */
export const CandidateApplicationsBlockedNotice: React.FC = () => (
  <div className="card stack guest-job-gate" style={{ maxWidth: '32rem' }}>
    <div className="alert-box-error" style={{ marginBottom: 0 }}>
      <strong>Job access restricted</strong>
      <p style={{ margin: '0.5rem 0 0' }}>
        You cannot view job details or submit applications at this time. Contact Progress Manpower
        support if you believe this is a mistake or need help restoring access.
      </p>
    </div>

    <div className="stack" style={{ gap: '0.5rem', fontSize: '0.95rem' }}>
      <div>
        <strong>Progress Manpower PLC</strong>
      </div>
      <div>
        <strong>Location:</strong> {PROGRESS_HQ_LOCATION}
      </div>
      <div>
        <strong>Telephone:</strong>{' '}
        <a href={telHref(PROGRESS_OFFICE_PHONE)}>{PROGRESS_OFFICE_PHONE}</a>
      </div>
      <div>
        <strong>Mobile / Hotline:</strong>{' '}
        {PROGRESS_MOBILE_PHONES.map((phone, i) => (
          <React.Fragment key={phone}>
            {i > 0 ? ' / ' : null}
            <a href={telHref(phone)}>{phone}</a>
          </React.Fragment>
        ))}
      </div>
      <div>
        <strong>Email:</strong>{' '}
        <a href={`mailto:${PROGRESS_HIRE_EMAIL}`}>{PROGRESS_HIRE_EMAIL}</a>
      </div>
    </div>

    <div className="guest-job-gate-actions">
      <Link to="/contact" className="btn">
        Contact support
      </Link>
      <Link to="/jobs" className="btn btn-secondary">
        Back to jobs
      </Link>
    </div>
  </div>
);
