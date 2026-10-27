export type Workspace = 'candidate' | 'employer';

const WORKSPACE_KEY = 'progress.workspace';

export function getStoredWorkspace(): Workspace | null {
  if (typeof localStorage === 'undefined') return null;
  const value = localStorage.getItem(WORKSPACE_KEY);
  return value === 'candidate' || value === 'employer' ? value : null;
}

export function setStoredWorkspace(workspace: Workspace): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(WORKSPACE_KEY, workspace);
}

export function resolveWorkspace(
  roles: string[],
  stored: Workspace | null = getStoredWorkspace(),
): Workspace {
  const isCandidate = roles.includes('candidate');
  const isEmployer = roles.includes('employer');
  if (isEmployer && !isCandidate) return 'employer';
  if (isCandidate && !isEmployer) return 'candidate';
  if (stored) return stored;
  return 'candidate';
}

export function employerJobsPath(companyId: string): string {
  return `/company/${companyId}/jobs`;
}

export function postJobPath(companyId: string): string {
  return `/company/${companyId}/jobs/new`;
}

export function hiringDestination(companyId?: string | null): string {
  return companyId ? postJobPath(companyId) : '/employer/setup';
}

export function employerHomeDestination(companyId?: string | null): string {
  return companyId ? employerJobsPath(companyId) : '/employer/setup';
}
