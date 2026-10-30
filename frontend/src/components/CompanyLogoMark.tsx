import React, { useState } from 'react';
import { publicFileUrl } from '../api/files';

export const CompanyLogoMark: React.FC<{
  name?: string | null;
  logoId?: string | null;
  className?: string;
  imgClassName?: string;
}> = ({ name, logoId, className, imgClassName }) => {
  const url = logoId ? publicFileUrl(logoId) : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = name?.trim().charAt(0).toUpperCase() || 'C';
  if (url && failedUrl !== url) {
    return <img src={url} alt={`${name || 'Company'} logo`} className={imgClassName} loading="lazy" onError={() => setFailedUrl(url)} />;
  }
  return <div className={className}>{initial}</div>;
};
