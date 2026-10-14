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
  CreateEmployerDto,
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
  list() {
    return this.companies.adminList();
  }

  @Post()
  create(@Body() dto: CompanyDto) {
    return this.companies.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
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
  verify(@Param('id') id: string, @Body() dto: VerifyCompanyDto) {
    return this.companies.verify(id, dto);
  }

  @Patch(':id/featured')
  feature(@Param('id') id: string, @Query('value', ParseBoolPipe) value: boolean) {
    return this.companies.feature(id, value);
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
