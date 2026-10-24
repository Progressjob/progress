import React from 'react';
import { Link } from 'react-router-dom';

export const CandidateApplicationsBlockedNotice: React.FC = () => (
  <div className="alert-box-error" style={{ marginBottom: '1rem' }}>
    <strong>Applications restricted</strong>
    <p style={{ margin: '0.5rem 0 0' }}>
      You cannot submit new job applications at this time. Please{' '}
      <Link to="/contact">contact the administrators</Link> if you believe this is a mistake or need
      assistance.
    </p>
  </div>
);
