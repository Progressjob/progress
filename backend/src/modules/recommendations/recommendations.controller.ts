import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CompanyMemberGuard, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { CreateRecommendationDto, RespondRecommendationDto } from './recommendations.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('admin recommendations')
@ApiBearerAuth()
@Controller('admin/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminRecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecommendationDto) {
    return this.recommendations.create(user.id, dto);
  }

  @Get()
  list(
    @Query('companyId') companyId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('status') status?: string,
  ) {
    return this.recommendations.list({ companyId, candidateId, status });
  }
}

@ApiTags('employer recommendations')
@ApiBearerAuth()
@Controller('employer/companies/:companyId/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyMemberGuard)
@Roles('employer')
export class EmployerRecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  list(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.recommendations.employerList(companyId);
  }

  @Get(':id')
  detail(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recommendations.employerDetail(companyId, id);
  }

  @Patch(':id/respond')
  respond(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondRecommendationDto,
  ) {
    return this.recommendations.respond(companyId, id, dto);
  }
}
