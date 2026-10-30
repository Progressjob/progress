/** Visual active class for NavLink. Pass a boolean so only one item lights up. */
export function navActive(on: boolean): string | undefined {
  return on ? 'active' : undefined;
}

export function isExactPath(pathname: string, to: string): boolean {
  return pathname === to;
}

/** True for `to` and nested pages (`/jobs` and `/jobs/some-slug`). */
export function isSectionPath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isCompanyJobsList(pathname: string, companyId: string): boolean {
  return pathname === `/company/${companyId}/jobs`;
}

export function isCompanyPostJob(pathname: string, companyId: string): boolean {
  return pathname === `/company/${companyId}/jobs/new`;
}

export function isCompanyEditJob(pathname: string, companyId: string): boolean {
  return new RegExp(`^/company/${companyId}/jobs/[^/]+/edit$`).test(pathname);
}

export function isCompanyProfile(pathname: string, companyId: string): boolean {
  return pathname === `/company/${companyId}/profile`;
}

export function isCompanyCvSearch(pathname: string, companyId?: string): boolean {
  if (companyId) return isSectionPath(pathname, `/company/${companyId}/cv-search`);
  return /^\/company\/[^/]+\/cv-search(?:\/|$)/.test(pathname);
}

export function isAdminCvSearch(pathname: string): boolean {
  return isSectionPath(pathname, '/admin/cv-search');
}

export function isPublicCvSearch(pathname: string): boolean {
  return isSectionPath(pathname, '/cv-search');
}
