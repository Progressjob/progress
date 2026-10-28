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
  candidateProfile?: { id: string; applicationsBlocked?: boolean } | null;
  companyMemberships: Array<{ companyId: string; memberRole: string }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
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
  contactPerson?: string | null;
  licenceNumber?: string | null;
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
export type ApplicationMethod = 'internal' | 'external_url' | 'email' | 'admin';
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
  requestedDeadline?: string | null;
  deadlineChangeNote?: string | null;
  deadlineChangeRequestedAt?: string | null;
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
    originalFilename?: string;
    originalName?: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface CandidateEducation {
  id: string;
  candidateId: string;
  institution: string;
  qualification?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  grade?: string | null;
  description?: string | null;
}

export interface CandidateExperience {
  id: string;
  candidateId: string;
  companyName: string;
  jobTitle: string;
  workingCity?: string | null;
  salary?: string | null;
  employmentType?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

export interface CandidateCertification {
  id: string;
  candidateId: string;
  name: string;
  issuer?: string | null;
  issuedDate?: string | null;
  credentialId?: string | null;
}

export interface CandidateLanguage {
  id: string;
  candidateId: string;
  name: string;
  proficiency?: string | null;
  reading?: string | null;
  writing?: string | null;
  listening?: string | null;
}

export interface CandidateSkillLink {
  candidateId: string;
  skillId: string;
  proficiencyLevel?: string | null;
  yearsExperience?: number | null;
  skill: Skill;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  headline?: string | null;
  summary?: string | null;
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  careerLevel?: string | null;
  managerialExperience?: string | null;
  yearsExperience?: number | string | null;
  currentSalary?: number | null;
  salaryCurrency?: string | null;
  expectedSalary?: number | null;
  availabilityStatus?: string | null;
  profileVisibility: 'public' | 'employers' | 'private';
  photoFileId?: string | null;
  photo?: { id: string; originalFilename?: string; mimeType?: string } | null;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  educations?: CandidateEducation[];
  experiences?: CandidateExperience[];
  skills?: CandidateSkillLink[];
  certifications?: CandidateCertification[];
  languages?: CandidateLanguage[];
  resumes?: CandidateResume[];
}

export interface SavedJob {
  candidateId: string;
  jobId: string;
  createdAt: string;
  job?: Job;
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

export interface AdminCandidateApplication {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    slug: string;
    company: { id: string; name: string; slug: string };
  };
}

export type AdminCandidateOutcome = 'working' | 'offered' | 'in_pipeline' | 'closed_out' | 'none';

export interface AdminCandidateUser {
  id: string;
  email: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  accountStatus: string;
  createdAt: string;
  lastLoginAt?: string | null;
  profile: {
    id: string;
    headline?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    availabilityStatus?: string | null;
    applicationsBlocked?: boolean;
  } | null;
  stats: {
    applicationsCount: number;
    activeApplicationsCount: number;
    resumeCount: number;
  };
  outcome: AdminCandidateOutcome;
  placement: {
    applicationId: string;
    status: ApplicationStatus;
    appliedAt: string;
    updatedAt: string;
    jobTitle: string;
    jobSlug: string;
    jobId: string;
    companyId: string;
    companyName: string;
    companySlug: string;
  } | null;
  applications: AdminCandidateApplication[];
}

export interface TalentCard {
  id: string;
  firstName: string;
  lastName: string;
  photoFileId?: string | null;
  headline?: string | null;
  currentTitle?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  gender?: string | null;
  yearsExperience?: number | string | null;
  summary?: string | null;
  availabilityStatus?: string | null;
}

export interface TalentResume {
  id: string;
  title: string;
  fileId: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface TalentDetail extends TalentCard {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  careerLevel?: string | null;
  managerialExperience?: string | null;
  educations: CandidateEducation[];
  experiences: CandidateExperience[];
  skills: CandidateSkillLink[];
  certifications: CandidateCertification[];
  languages: CandidateLanguage[];
  resume?: TalentResume | null;
}

export interface TalentSearchResponse {
  items: TalentCard[];
  total: number;
  page: number;
  limit: number;
}

export interface TalentSpotlightResponse {
  searchableCount: number;
  items: TalentCard[];
}
