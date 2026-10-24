import type { CompanyPayload, CreateEmployerPayload } from '../../api/admin';
import type { CreateAdminJobPayload } from '../../api/admin';

export function emptyCompanyForm(): CompanyPayload {
  return {
    name: '',
    country: 'Ethiopia',
    description: '',
    websiteUrl: '',
    email: '',
    phone: '',
    region: '',
    city: '',
    address: '',
    companySize: '',
    industryId: '',
  };
}

export function emptyEmployerForm(): CreateEmployerPayload {
  return {
    email: '',
    firstName: '',
    lastName: '',
    temporaryPassword: generateTemporaryPassword(),
    memberRole: 'owner',
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
    description: '',
    summary: '',
    referenceCode: '',
    responsibilities: '',
    requirements: '',
    educationRequirement: '',
    employmentType: 'full_time',
    workplaceType: 'on_site',
    applicationMethod: 'internal',
    applicationDeadline: '2026-12-31',
    vacanciesCount: 1,
    salaryCurrency: 'ETB',
    salaryVisibility: false,
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
    companySize: c.companySize ?? undefined,
    foundedYear: c.foundedYear ?? undefined,
  };
}
