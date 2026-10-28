import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const JobDetailLink: React.FC<{
  slug: string;
  className?: string;
  children: React.ReactNode;
}> = ({ slug, className, children }) => {
  const { user } = useAuth();
  const from = `/jobs/${slug}`;
  if (user) {
    return (
      <Link to={from} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/login" state={{ from }} className={className}>
      {children}
    </Link>
  );
};

export const GuestJobAccessNote: React.FC = () => (
  <p className="guest-job-note">
    Visitors can browse openings. Sign in to view full job details.{' '}
    <Link to="/login">Sign in</Link>
    {' · '}
    <Link to="/register">Create account</Link>
  </p>
);
