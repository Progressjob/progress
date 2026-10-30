import React from 'react';
import { publicFileUrl } from '../api/files';

export const CompanyLogoMark: React.FC<{
  name?: string | null;
  logoId?: string | null;
  className?: string;
  imgClassName?: string;
}> = ({ name, logoId, className, imgClassName }) => {
  const url = logoId ? publicFileUrl(logoId) : null;
  const initial = name?.trim().charAt(0).toUpperCase() || 'C';
  if (url) {
    return <img src={url} alt={name ?? ''} className={imgClassName} />;
  }
  return <div className={className}>{initial}</div>;
};
