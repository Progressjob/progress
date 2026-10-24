export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthMeResponse {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  accountStatus: string;
  roles: Array<{ role: { name: string } }>;
  candidateProfile?: { id: string } | null;
  companyMemberships: Array<{ companyId: string; memberRole: string }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
}

export interface Location {
  id: string;
  country: string;
  region?: string | null;
  city?: string | null;
  name: string;
  slug: string;
}

export interface Skill {
  id: string;
  name: string;
}

export type CompanyPortalStatus = 'active' | 'suspended';

export type CompanyMemberRole = 'owner' | 'recruiter' | 'hiring_manager';

export interface Company {
  id: string;
  name: string;
  slug: string;
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
  verificationStatus: 'pending' | 'verified' | 'rejected';
  canSelfPublishJobs?: boolean;
  portalStatus?: CompanyPortalStatus;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  isFeatured: boolean;
  industry?: Industry | null;
  logo?: { id: string } | null;
  jobs?: Job[];
  _count?: { jobs?: number; members?: number };
}

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'temporary'
  | 'volunteer';

export type WorkplaceType = 'on_site' | 'hybrid' | 'remote';
export type ApplicationMethod = 'internal' | 'external_url' | 'email';
export type JobStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'closed' | 'archived';
export type ApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type QuestionType = 'text' | 'number' | 'yes_no' | 'single_choice' | 'multiple_choice';

export interface ScreeningQuestion {
  id: string;
  jobId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[] | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface Job {
  id: string;
  companyId: string;
  categoryId: string;
  locationId?: string | null;
  title: string;
  slug: string;
  referenceCode?: string | null;
  summary?: string | null;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  educationRequirement?: string | null;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  employmentType: EmploymentType;
  careerLevel?: string | null;
  workplaceType: WorkplaceType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryVisibility?: boolean;
  vacanciesCount: number;
  applicationMethod: ApplicationMethod;
  applicationUrl?: string | null;
  applicationEmail?: string | null;
  applicationInstructions?: string | null;
  applicationDeadline: string;
  status: JobStatus;
  postedAt?: string | null;
  createdAt?: string;
  company?: Company;
  category?: Category;
  location?: Location | null;
  skills?: Array<{ id: string; skillId: string; isRequired: boolean; skill: Skill }>;
  screeningQuestions?: ScreeningQuestion[];
  _count?: { applications: number; views: number };
}

export interface CandidateResume {
  id: string;
  candidateId: string;
  fileId: string;
  title: string;
  isDefault: boolean;
  createdAt: string;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface CandidateProfile {
  id: string;
  userId: string;
  headline?: string | null;
  summary?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  yearsExperience?: number | null;
  currentSalary?: number | null;
  salaryCurrency?: string | null;
  expectedSalary?: number | null;
  availabilityStatus?: string | null;
  profileVisibility: 'public' | 'employers' | 'private';
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  resumes?: CandidateResume[];
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId?: string | null;
  coverLetter?: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  job?: Job;
  candidate?: {
    id: string;
    headline?: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
    };
  };
  resume?: CandidateResume | null;
  answers?: Array<{
    id: string;
    questionId: string;
    answerText: string;
    question?: ScreeningQuestion;
  }>;
}

export interface AdminDashboard {
  companies: number;
  jobs: number;
  candidates: number;
  registeredCandidates?: number;
  applications: number;
  pendingReports: number;
  pendingReviewJobs: number;
  publishedJobs: number;
}

export interface AdminCandidateUser {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  accountStatus: string;
  createdAt: string;
  candidateProfile?: { id: string; headline?: string | null } | null;
}
