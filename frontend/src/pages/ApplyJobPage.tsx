import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** In-app apply is retired; send leftover /apply URLs to the job listing. */
export const ApplyJobPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/jobs/${slug}` : '/jobs'} replace />;
};
