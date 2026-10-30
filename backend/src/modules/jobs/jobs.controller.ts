import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmploymentType, JobStatus, WorkplaceType } from '@prisma/client';
import {
  AuthUser,
  CompanyMemberGuard,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../common/auth';
import {
  CreateJobDto,
  EmployerCreateJobDto,
  EmployerUpdateJobDto,
  ReplaceJobSkillsDto,
  ReplaceScreeningDto,
  UpdateJobDto,
} from './jobs.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class PublicJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('company') company?: string,
    @Query('employment_type', new ParseEnumPipe(EmploymentType, { optional: true }))
    employmentType?: EmploymentType,
    @Query('career_level') careerLevel?: string,
    @Query('workplace_type', new ParseEnumPipe(WorkplaceType, { optional: true }))
    workplaceType?: WorkplaceType,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.jobs.listPublic({
      q,
      category,
      location,
      company,
      employmentType,
      careerLevel,
      workplaceType,
      page,
      limit,
    });
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('candidate')
  @ApiBearerAuth()
  recommendations(@CurrentUser() user: AuthUser) {
    return this.jobs.recommendations(user.id);
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-view-source') source?: string,
  ) {
    return this.jobs.publicDetail(slug, sessionId, source);
  }
}

@ApiTags('admin jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('status', new ParseEnumPipe(JobStatus, { optional: true })) status?: JobStatus,
    @Query('companyId', new ParseUUIDPipe({ optional: true })) companyId?: string,
    @Query('employmentType', new ParseEnumPipe(EmploymentType, { optional: true }))
    employmentType?: EmploymentType,
    @Query('workplaceType', new ParseEnumPipe(WorkplaceType, { optional: true }))
    workplaceType?: WorkplaceType,
    @Query('employerEdited') employerEdited?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.jobs.adminList({
      q,
      status,
      companyId,
      employmentType,
      workplaceType,
      employerEdited:
        employerEdited === 'true' || employerEdited === '1'
          ? true
          : employerEdited === 'false' || employerEdited === '0'
            ? false
            : undefined,
      page,
      pageSize,
    });
  }

  @Get('pending')
  pending(
    @Query('q') q?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.jobs.adminList({ status: 'pending_review', q, page, pageSize });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.adminGet(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
    return this.jobs.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobs.update(id, dto, { actorId: user.id, source: 'admin' });
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.jobs.transition(id, 'rejected', user.id);
  }

  @Post(':id/:transition')
  transition(
    @Param('id') id: string,
    @Param('transition') transition: 'publish' | 'close' | 'archive',
    @CurrentUser() user: AuthUser,
  ) {
    const states: Record<typeof transition, JobStatus> = {
      publish: 'published',
      close: 'closed',
      archive: 'archived',
    };
    return this.jobs.transition(id, states[transition], user.id);
  }

  @Put(':id/screening-questions')
  screening(@Param('id') id: string, @Body() dto: ReplaceScreeningDto) {
    return this.jobs.replaceScreening(id, dto);
  }

  @Put(':id/skills')
  skills(@Param('id') id: string, @Body() dto: ReplaceJobSkillsDto) {
    return this.jobs.replaceSkills(id, dto);
  }
}

@ApiTags('employer jobs')
@ApiBearerAuth()
@Controller('employer/companies/:companyId/jobs')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyMemberGuard)
@Roles('employer')
export class EmployerJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('companyId') companyId: string) {
    return this.jobs.employerJobs(user.id, companyId);
  }

  @Get(':jobId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobs.employerGet(user.id, companyId, jobId);
  }

  @Get(':jobId/stats')
  stats(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobs.employerStats(user.id, companyId, jobId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Body() dto: EmployerCreateJobDto,
  ) {
    return this.jobs.employerCreate(user.id, companyId, dto);
  }

  @Patch(':jobId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
    @Body() dto: EmployerUpdateJobDto,
  ) {
    return this.jobs.employerUpdate(user.id, companyId, jobId, dto);
  }

  @Post(':jobId/submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobs.employerSubmit(user.id, companyId, jobId);
  }
}
