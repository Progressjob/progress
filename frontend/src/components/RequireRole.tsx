import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface RequireRoleProps {
  roles: string[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="card">Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasRole(...roles)) {
    return (
      <div className="card alert-error">
        <h2>403 — Access Denied</h2>
        <p>
          Your account roles (<code>{user.roles.join(', ') || 'none'}</code>) do not include the
          required role (<code>{roles.join(' or ')}</code>) for this section.
        </p>
        <Link to="/jobs" className="btn">
          Back to Job Board
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
