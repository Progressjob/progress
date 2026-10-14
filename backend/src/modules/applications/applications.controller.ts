import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import {
  AuthUser,
  CompanyMemberGuard,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../common/auth';
import {
  ApplyDto,
  ChangeApplicationStatusDto,
  CreateInterviewDto,
  UpdateInterviewDto,
} from './applications.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('applications')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidateApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post('jobs/:jobId/applications')
  @Roles('candidate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  apply(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyDto,
  ) {
    return this.applications.apply(user.id, jobId, dto);
  }

  @Get('candidate/applications')
  @Roles('candidate')
  list(@CurrentUser() user: AuthUser) {
    return this.applications.candidateList(user.id);
  }

  @Get('candidate/applications/:id')
  @Roles('candidate')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.applications.candidateDetail(user.id, id);
  }

  @Post('candidate/applications/:id/withdraw')
  @Roles('candidate')
  withdraw(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.applications.withdraw(user.id, id);
  }
}

@ApiTags('employer applications')
@ApiBearerAuth()
@Controller('employer/companies/:companyId')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyMemberGuard)
@Roles('employer')
export class EmployerApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('jobs/:jobId/applications')
  list(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
    @Query('status', new ParseEnumPipe(ApplicationStatus, { optional: true }))
    status?: ApplicationStatus,
    @Query('search') search?: string,
  ) {
    return this.applications.employerList(user.id, companyId, jobId, status, search);
  }

  @Get('applications/:id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.applications.employerDetail(user.id, companyId, id);
  }

  @Patch('applications/:id/status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ChangeApplicationStatusDto,
  ) {
    return this.applications.changeStatus(user.id, companyId, id, dto);
  }

  @Post('applications/:id/interviews')
  interview(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.applications.createInterview(user.id, companyId, id, dto);
  }

  @Patch('interviews/:id')
  updateInterview(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.applications.updateInterview(user.id, companyId, id, dto);
  }
}
