import type { CompanyPayload, CreateEmployerPayload } from '../../api/admin';
import type { CreateAdminJobPayload } from '../../api/admin';
import { normalizeEducationRequirement } from '../../constants/educationLevels';
import { PROGRESS_HIRE_EMAIL } from '../../constants/progressContact';
import type { Job } from '../../types/api';

export function emptyCompanyForm(): CompanyPayload {
  return {
    name: '',
    country: 'Ethiopia',
    description: '',
    email: '',
    phone: '',
    region: '',
    city: '',
    address: '',
    companySize: '',
    industryId: '',
  };
}

/** Strip empty strings so optional URL and text fields do not fail validation. */
export function sanitizeCompanyPayload(company: CompanyPayload): CompanyPayload {
  const trim = (s?: string) => {
    const t = s?.trim();
    return t ? t : undefined;
  };
  return {
    ...company,
    industryId: company.industryId || undefined,
    description: trim(company.description),
    websiteUrl: trim(company.websiteUrl),
    email: trim(company.email),
    phone: trim(company.phone),
    region: trim(company.region),
    city: trim(company.city),
    address: trim(company.address),
    contactPerson: trim(company.contactPerson),
    licenceNumber: trim(company.licenceNumber),
    companySize: trim(company.companySize),
    foundedYear: company.foundedYear,
    logoFileId: company.logoFileId,
  };
}

export function emptyEmployerForm(): CreateEmployerPayload {
  return {
    email: '',
    temporaryPassword: generateTemporaryPassword(),
  };
}

export function generateTemporaryPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

export function emptyAdminJobForm(companyId = ''): CreateAdminJobPayload {
  return {
    companyId,
    categoryId: '',
    title: '',
    responsibilities: '',
    requirements: '',
    educationRequirement: '',
    employmentType: 'full_time',
    workplaceType: 'on_site',
    applicationDeadline: '2026-12-31',
    vacanciesCount: 1,
    salaryCurrency: 'ETB',
  };
}

export function companyFromRecord(c: {
  name: string;
  industryId?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  licenceNumber?: string | null;
  logoFileId?: string | null;
  logo?: { id: string } | null;
  companySize?: string | null;
  foundedYear?: number | null;
  industry?: { id: string } | null;
}): CompanyPayload {
  return {
    name: c.name,
    industryId: c.industryId ?? c.industry?.id ?? undefined,
    description: c.description ?? undefined,
    websiteUrl: c.websiteUrl ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    country: c.country ?? 'Ethiopia',
    region: c.region ?? undefined,
    city: c.city ?? undefined,
    address: c.address ?? undefined,
    contactPerson: c.contactPerson ?? undefined,
    licenceNumber: c.licenceNumber ?? undefined,
    logoFileId: c.logoFileId ?? c.logo?.id ?? undefined,
    companySize: c.companySize ?? undefined,
    foundedYear: c.foundedYear ?? undefined,
  };
}

export function jobFromRecord(job: Job, companyId: string): CreateAdminJobPayload {
  const deadline = job.applicationDeadline.slice(0, 10);
  const method =
    job.applicationMethod === 'email' || job.applicationMethod === 'admin'
      ? job.applicationMethod
      : 'admin';
  return {
    companyId,
    categoryId: job.categoryId,
    locationId: job.locationId ?? undefined,
    title: job.title,
    responsibilities: job.responsibilities ?? job.description ?? '',
    requirements: job.requirements ?? '',
    educationRequirement: normalizeEducationRequirement(job.educationRequirement),
    experienceMinYears: job.experienceMinYears != null ? Number(job.experienceMinYears) : undefined,
    employmentType: job.employmentType,
    workplaceType: job.workplaceType,
    salaryMin: job.salaryMin != null ? Number(job.salaryMin) : undefined,
    salaryMax: job.salaryMax != null ? Number(job.salaryMax) : undefined,
    salaryCurrency: job.salaryCurrency ?? 'ETB',
    salaryVisibility: job.salaryVisibility ?? false,
    applicationDeadline: deadline,
    vacanciesCount: job.vacanciesCount,
    applicationMethod: method,
    applicationEmail: job.applicationEmail ?? undefined,
    applicationInstructions: job.applicationInstructions ?? undefined,
  };
}

/** Normalize job form values before API create. */
export function sanitizeJobPayload(form: CreateAdminJobPayload): CreateAdminJobPayload {
  const trim = (s?: string) => {
    const t = s?.trim();
    return t ? t : undefined;
  };
  const responsibilities = trim(form.responsibilities);
  const applicationEmail = trim(form.applicationEmail);
  const applicationInstructions = trim(form.applicationInstructions);

  if (form.applicationMethod !== 'email' && form.applicationMethod !== 'admin') {
    throw new Error('Choose how candidates should apply.');
  }
  if (form.applicationMethod === 'email' && !applicationEmail && !applicationInstructions) {
    throw new Error('Enter how candidates should contact you.');
  }

  return {
    ...form,
    description: responsibilities ?? '',
    responsibilities,
    requirements: trim(form.requirements),
    educationRequirement: trim(normalizeEducationRequirement(form.educationRequirement)),
    locationId: form.locationId || undefined,
    applicationMethod: form.applicationMethod,
    applicationEmail:
      form.applicationMethod === 'admin' ? PROGRESS_HIRE_EMAIL : applicationEmail,
    applicationInstructions:
      form.applicationMethod === 'admin' ? undefined : applicationInstructions,
  };
}
