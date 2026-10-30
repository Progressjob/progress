import { profileTerms, recommendationScore } from './jobs.recommendations';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  ApplicationMethod,
  EmploymentType,
  JobRevisionSource,
  JobStatus,
  Prisma,
  WorkplaceType,
} from '@prisma/client';
import { PROGRESS_HIRE_EMAIL } from '../../common/progress-contact';
import { slugify } from '../../common/slug';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJobDto,
  EmployerCreateJobDto,
  EmployerUpdateJobDto,
  ReplaceJobSkillsDto,
  ReplaceScreeningDto,
  UpdateJobDto,
} from './jobs.dto';
import {
  diffJobContent,
  mergeJobSnapshot,
  type JobContentSnapshot,
} from './jobs.revisions';

const EMPLOYER_EDITABLE_STATUSES: JobStatus[] = [
  'draft',
  'pending_review',
  'rejected',
  'published',
];

@Injectable()
export class JobPostingPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyPostingContext(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.verificationStatus !== 'verified') {
      throw new ForbiddenException('Your business licence must be approved by an administrator before you can post jobs.');
    }
    if (company.portalStatus === 'suspended') {
      throw new ForbiddenException('This company cannot post jobs while access is suspended');
    }
    if (!company.logoFileId) {
      throw new BadRequestException(
        'Add a company logo before posting jobs. The same logo is used on every vacancy.',
      );
    }
    const canSelfPublish =
      company.canSelfPublishJobs && company.verificationStatus === 'verified';
    return { company, canSelfPublish };
  }

  async assertCanPost(companyId: string): Promise<void> {
    await this.getCompanyPostingContext(companyId);
  }
}

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['pending_review', 'published', 'archived'],
  pending_review: ['published', 'rejected'],
  published: ['closed'],
  rejected: ['draft', 'archived'],
  closed: ['archived', 'published'],
  archived: [],
};

export function assertJobTransition(current: JobStatus, next: JobStatus): void {
  if (!JOB_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(`Cannot move a job from ${current} to ${next}`);
  }
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: JobPostingPolicy,
  ) {}

  async recommendations(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: { educations: true, experiences: true, skills: true },
    });
    const terms = profile ? profileTerms(profile) : new Set<string>();
    const skillIds = new Set(profile?.skills.map((skill) => skill.skillId) ?? []);
    const fallback = async (reason: 'incomplete_profile' | 'no_matches') => ({
      data: (await this.listPublic({ limit: 8 })).data,
      personalized: false,
      reason,
    });
    if (!terms.size && !skillIds.size) return fallback('incomplete_profile');
    const eligible = {
      status: JobStatus.published,
      postedAt: { not: null },
      applicationDeadline: { gte: this.today() },
    };
    // Score the full eligible pool, not just the first page of featured jobs.
    const jobs = await this.prisma.job.findMany({
      where: eligible,
      select: { id: true, title: true, educationRequirement: true,
        category: { select: { name: true } }, skills: { select: { skillId: true } } },
      orderBy: [{ isFeatured: 'desc' }, { postedAt: 'desc' }, { id: 'asc' }],
    });
    const ranked = jobs.map((job) => ({ id: job.id, score: recommendationScore(terms, skillIds, job) }))
      .filter((job) => job.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!ranked.length) return fallback('no_matches');
    const matches = await this.prisma.job.findMany({
      where: { ...eligible, id: { in: ranked.map((job) => job.id) } },
      include: { company: { include: { logo: true } }, category: true, location: true },
    });
    const byId = new Map(matches.map((job) => [job.id, job]));
    return { data: ranked.flatMap(({ id }) => byId.has(id) ? [byId.get(id)!] : []),
      personalized: true, reason: null };
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    location?: string;
    company?: string;
    employmentType?: EmploymentType;
    careerLevel?: string;
    workplaceType?: WorkplaceType;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    let matchingIds: string[] | undefined;
    if (filters.q?.trim()) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM jobs
        WHERE search_vector @@ websearch_to_tsquery('english', ${filters.q.trim()})
        ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${filters.q.trim()})) DESC
        LIMIT 1000
      `);
      matchingIds = rows.map((row) => row.id);
      if (!matchingIds.length) return { data: [], page, limit, total: 0 };
    }
    const where: Prisma.JobWhereInput = {
      id: matchingIds ? { in: matchingIds } : undefined,
      status: 'published',
      postedAt: { not: null },
      applicationDeadline: { gte: this.today() },
      category: filters.category ? { slug: filters.category } : undefined,
      location: filters.location ? { slug: filters.location } : undefined,
      company: filters.company ? { slug: filters.company } : undefined,
      employmentType: filters.employmentType,
      careerLevel: filters.careerLevel,
      workplaceType: filters.workplaceType,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { postedAt: 'desc' }],
        include: { company: { include: { logo: true } }, category: true, location: true },
      }),
      this.prisma.job.count({ where }),
    ]);
    return { data, page, limit, total };
  }

  async publicDetail(slug: string, sessionId?: string, source?: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, status: 'published', applicationDeadline: { gte: this.today() } },
      include: {
        company: { include: { logo: true, industry: true } },
        category: true,
        location: true,
        skills: { include: { skill: true } },
        screeningQuestions: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (sessionId) {
      const since = new Date(Date.now() - 86_400_000);
      const exists = await this.prisma.jobView.findFirst({
        where: { jobId: job.id, sessionId, viewedAt: { gte: since } },
      });
      if (!exists) {
        await this.prisma.jobView.create({ data: { jobId: job.id, sessionId, source } });
      }
    }
    return job;
  }

  async adminList(filters: {
    q?: string;
    status?: JobStatus;
    companyId?: string;
    employmentType?: EmploymentType;
    workplaceType?: WorkplaceType;
    employerEdited?: boolean;
    page?: number;
    pageSize?: number;
  } = {}) {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const term = filters.q?.trim();
    const where: Prisma.JobWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
      ...(filters.workplaceType ? { workplaceType: filters.workplaceType } : {}),
      ...(filters.employerEdited === true
        ? { revisions: { some: { source: 'employer' } } }
        : filters.employerEdited === false
          ? { revisions: { none: { source: 'employer' } } }
          : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { referenceCode: { contains: term, mode: 'insensitive' } },
              { slug: { contains: term, mode: 'insensitive' } },
              { company: { name: { contains: term, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          category: true,
          location: true,
          _count: { select: { revisions: { where: { source: 'employer' } } } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, ...job }) => ({
        ...job,
        employerEdited: _count.revisions > 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async adminGet(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        category: true,
        location: true,
        skills: { include: { skill: true } },
        screeningQuestions: { orderBy: { sortOrder: 'asc' } },
        revisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return {
      ...job,
      employerEdited: job.revisions.some((revision) => revision.source === 'employer'),
    };
  }

  async create(actorId: string, dto: CreateJobDto) {
    this.validateRanges(dto);
    await this.policy.assertCanPost(dto.companyId);
    const hire = this.normalizeHireContact(dto);
    const base = slugify(`${dto.title}-${Date.now()}`);
    return this.prisma.job.create({
      data: {
        ...dto,
        ...hire,
        applicationDeadline: new Date(dto.applicationDeadline),
        createdBy: actorId,
        slug: base,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateJobDto,
    actor?: { actorId: string; source: JobRevisionSource },
  ) {
    this.validateRanges(dto);
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'archived') throw new BadRequestException('Archived jobs cannot be edited');
    const { companyId: _companyId, ...patch } = dto;
    const hire = patch.applicationMethod ? this.normalizeHireContact(patch) : {};
    const deadline = patch.applicationDeadline
      ? new Date(patch.applicationDeadline)
      : undefined;
    const data: Prisma.JobUncheckedUpdateInput = {
      ...patch,
      ...hire,
      applicationDeadline: deadline,
    };
    const next = mergeJobSnapshot(job as JobContentSnapshot, {
      ...patch,
      ...hire,
      applicationDeadline: deadline,
    });
    const labels = await this.revisionLabels(job, next);
    const changes = diffJobContent(job as JobContentSnapshot, next, labels);

    if (!actor || !changes.length) {
      return this.prisma.job.update({ where: { id }, data });
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.jobRevision.create({
        data: {
          jobId: id,
          actorUserId: actor.actorId,
          source: actor.source,
          changes: changes as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.job.update({ where: { id }, data }),
    ]);
    return updated;
  }

  async transition(id: string, next: JobStatus, actorId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    assertJobTransition(job.status, next);
    if (next === 'published') await this.policy.assertCanPost(job.companyId);
    if (next === 'published' && job.applicationDeadline < this.today()) {
      throw new BadRequestException('The application deadline has passed');
    }
    return this.prisma.job.update({
      where: { id },
      data: {
        status: next,
        postedAt: next === 'published' ? new Date() : job.postedAt,
        approvedBy: next === 'published' ? actorId : job.approvedBy,
        approvedAt: next === 'published' ? new Date() : job.approvedAt,
      },
    });
  }

  replaceScreening(id: string, dto: ReplaceScreeningDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobScreeningQuestion.deleteMany({ where: { jobId: id } });
      if (dto.questions.length) {
        await tx.jobScreeningQuestion.createMany({
          data: dto.questions.map((question) => ({
            ...question,
            jobId: id,
            options: question.options as Prisma.InputJsonValue,
          })),
        });
      }
      return tx.jobScreeningQuestion.findMany({
        where: { jobId: id },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  replaceSkills(id: string, dto: ReplaceJobSkillsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobSkill.deleteMany({ where: { jobId: id } });
      if (dto.skills.length) {
        await tx.jobSkill.createMany({
          data: dto.skills.map((skill) => ({ jobId: id, ...skill })),
        });
      }
      return tx.jobSkill.findMany({ where: { jobId: id }, include: { skill: true } });
    });
  }

  employerJobs(userId: string, companyId: string) {
    return this.prisma.job.findMany({
      where: {
        companyId,
        company: { members: { some: { userId, status: 'active' } } },
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true, views: true } } },
    });
  }

  async employerCreate(userId: string, companyId: string, dto: EmployerCreateJobDto) {
    await this.assertCompanyMember(userId, companyId);
    await this.policy.assertCanPost(companyId);
    return this.create(userId, { ...dto, companyId });
  }

  async employerGet(userId: string, companyId: string, jobId: string) {
    return this.getEmployerManagedJob(userId, companyId, jobId);
  }

  async employerUpdate(
    userId: string,
    companyId: string,
    jobId: string,
    dto: EmployerUpdateJobDto,
  ) {
    const job = await this.getEmployerManagedJob(userId, companyId, jobId);
    if (!EMPLOYER_EDITABLE_STATUSES.includes(job.status)) {
      throw new BadRequestException('This job cannot be edited in its current status');
    }
    return this.update(jobId, dto, { actorId: userId, source: 'employer' });
  }

  async employerSubmit(userId: string, companyId: string, jobId: string) {
    const job = await this.getEmployerManagedJob(userId, companyId, jobId);
    const { canSelfPublish } = await this.policy.getCompanyPostingContext(companyId);
    const next: JobStatus = canSelfPublish ? 'published' : 'pending_review';
    if (!['draft', 'rejected'].includes(job.status)) {
      throw new BadRequestException('Only draft or rejected jobs can be submitted');
    }
    const updated = await this.transition(jobId, next, userId);
    if (next === 'pending_review') {
      await this.notifyReviewers(updated);
    }
    return updated;
  }

  private async notifyReviewers(job: { id: string; title: string; companyId: string }) {
    const [reviewers, company] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          accountStatus: 'active',
          roles: { some: { role: { name: { in: ['admin', 'moderator'] } } } },
        },
        select: { id: true },
      }),
      this.prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      }),
    ]);
    if (!reviewers.length) return;
    const employerName = company?.name ?? 'An employer';
    await this.prisma.notification.createMany({
      data: reviewers.map((reviewer) => ({
        userId: reviewer.id,
        title: 'Job waiting to be posted',
        message: `${employerName} submitted "${job.title}" for review. It stays off the public board until an administrator posts it.`,
        type: 'job_pending_review',
        referenceType: 'job',
        referenceId: job.id,
      })),
    });
  }

  async employerStats(userId: string, companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
        company: { members: { some: { userId, status: 'active' } } },
      },
      select: { id: true },
    });
    if (!job) throw new ForbiddenException();
    const [views, applications] = await this.prisma.$transaction([
      this.prisma.jobView.count({ where: { jobId } }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { jobId },
        orderBy: { status: 'asc' },
        _count: true,
      }),
    ]);
    return { views, applications };
  }

  @Cron('0 5 * * *')
  closeExpiredJobs() {
    return this.prisma.job.updateMany({
      where: { status: 'published', applicationDeadline: { lt: this.today() } },
      data: { status: 'closed' },
    });
  }

  private async assertCompanyMember(userId: string, companyId: string): Promise<void> {
    const member = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'active' },
    });
    if (!member) throw new ForbiddenException();
  }

  private async getEmployerManagedJob(userId: string, companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
        company: { members: { some: { userId, status: 'active' } } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private normalizeHireContact(dto: Pick<UpdateJobDto, 'applicationMethod' | 'applicationEmail' | 'applicationInstructions'>): {
    applicationMethod: ApplicationMethod;
    applicationEmail: string | null;
    applicationInstructions: string | null;
    applicationUrl: null;
  } {
    if (dto.applicationMethod === 'admin') {
      return {
        applicationMethod: 'admin',
        applicationEmail: PROGRESS_HIRE_EMAIL,
        applicationInstructions: dto.applicationInstructions?.trim() || null,
        applicationUrl: null,
      };
    }
    if (dto.applicationMethod === 'email') {
      const instructions = dto.applicationInstructions?.trim() || null;
      const fromBox = instructions?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
      const email = dto.applicationEmail?.trim() || fromBox;
      if (!email && !instructions) {
        throw new BadRequestException('Provide how candidates should get in touch');
      }
      return {
        applicationMethod: 'email',
        applicationEmail: email,
        applicationInstructions: instructions,
        applicationUrl: null,
      };
    }
    throw new BadRequestException('Choose company contact or hire through Progress');
  }

  private validateRanges(dto: UpdateJobDto): void {
    if (
      dto.salaryMin !== undefined &&
      dto.salaryMax !== undefined &&
      dto.salaryMin > dto.salaryMax
    ) {
      throw new BadRequestException('salaryMin must not exceed salaryMax');
    }
    if (
      dto.experienceMinYears !== undefined &&
      dto.experienceMaxYears !== undefined &&
      dto.experienceMinYears > dto.experienceMaxYears
    ) {
      throw new BadRequestException('experienceMinYears must not exceed experienceMaxYears');
    }
  }

  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private async revisionLabels(before: { categoryId: string; locationId: string | null }, after: JobContentSnapshot) {
    const categoryIds = [before.categoryId, after.categoryId].filter(
      (id, index, all): id is string => Boolean(id) && all.indexOf(id) === index,
    );
    const locationIds = [before.locationId, after.locationId].filter(
      (id, index, all): id is string => Boolean(id) && all.indexOf(id) === index,
    );
    const [categories, locations] = await Promise.all([
      categoryIds.length
        ? this.prisma.jobCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      locationIds.length
        ? this.prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const categoryName = Object.fromEntries(categories.map((row) => [row.id, row.name]));
    const locationName = Object.fromEntries(locations.map((row) => [row.id, row.name]));
    return {
      categoryFrom: before.categoryId ? categoryName[before.categoryId] ?? null : null,
      categoryTo: after.categoryId ? categoryName[after.categoryId] ?? null : null,
      locationFrom: before.locationId ? locationName[before.locationId] ?? null : null,
      locationTo: after.locationId ? locationName[after.locationId] ?? null : null,
    };
  }
}
