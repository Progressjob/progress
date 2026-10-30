import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CompanyMemberGuard,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../common/auth';
import {
  CompanyDto,
  CompanyPortalStatusDto,
  CompanyPostingAccessDto,
  CreateEmployerDto,
  ProvisionCompanyDto,
  UpdateCompanyDto,
  UpdateMemberDto,
  VerifyCompanyDto,
} from './companies.dto';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
export class PublicCompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.companies.listPublic(page, limit);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.companies.detail(slug);
  }
}

@ApiTags('admin companies')
@ApiBearerAuth()
@Controller('admin/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminCompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.companies.adminList(q);
  }

  @Post('provision')
  provision(@CurrentUser() actor: AuthUser, @Body() dto: ProvisionCompanyDto) {
    return this.companies.provision(actor.id, dto);
  }

  @Post()
  create(@Body() dto: CompanyDto, @CurrentUser() actor: AuthUser) {
    return this.companies.create(dto, actor.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() actor: AuthUser) {
    return this.companies.update(id, dto, actor.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateEmployerDto,
  ) {
    return this.companies.addMember(id, actor.id, dto);
  }

  @Patch('members/:id')
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.companies.updateMember(id, dto);
  }

  @Patch(':id/verification')
  verify(@Param('id') id: string, @Body() dto: VerifyCompanyDto, @CurrentUser() actor: AuthUser) {
    return this.companies.verify(id, dto, actor.id);
  }

  @Patch(':id/featured')
  feature(@Param('id') id: string, @Query('value', ParseBoolPipe) value: boolean) {
    return this.companies.feature(id, value);
  }

  @Patch(':id/posting-access')
  postingAccess(@Param('id') id: string, @Body() dto: CompanyPostingAccessDto) {
    return this.companies.setPostingAccess(id, dto.canSelfPublishJobs);
  }

  @Patch(':id/portal-status')
  portalStatus(@Param('id') id: string, @Body() dto: CompanyPortalStatusDto) {
    return this.companies.setPortalStatus(id, dto.status, dto.reason);
  }
}

@ApiTags('employer company')
@ApiBearerAuth()
@Controller('employer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employer')
export class EmployerCompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('companies')
  list(@CurrentUser() user: AuthUser) {
    return this.companies.employerCompanies(user);
  }

  @Get('companies/:companyId')
  @UseGuards(CompanyMemberGuard)
  detail(@CurrentUser() user: AuthUser, @Param('companyId') companyId: string) {
    return this.companies.employerCompany(user.id, companyId);
  }

  @Patch('companies/:companyId')
  @UseGuards(CompanyMemberGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.employerUpdate(user.id, companyId, dto);
  }
}
