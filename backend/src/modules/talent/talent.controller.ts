import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyMemberGuard, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { TalentSearchQueryDto } from './talent.dto';
import { TalentService } from './talent.service';

@ApiTags('employer talent')
@ApiBearerAuth()
@Controller('employer/companies/:companyId/talent')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyMemberGuard)
@Roles('employer')
export class EmployerTalentController {
  constructor(private readonly talent: TalentService) {}

  @Get('spotlight')
  spotlight() {
    return this.talent.spotlight();
  }

  @Get()
  search(@Query() query: TalentSearchQueryDto) {
    return this.talent.search(query.q, query.page, query.limit);
  }

  @Get(':candidateId')
  detail(@Param('candidateId') candidateId: string) {
    return this.talent.detail(candidateId);
  }
}

@ApiTags('talent browse')
@ApiBearerAuth()
@Controller('talent')
@UseGuards(JwtAuthGuard)
export class TalentBrowseController {
  constructor(private readonly talent: TalentService) {}

  @Get('spotlight')
  spotlight() {
    return this.talent.spotlight();
  }

  @Get()
  search(@Query() query: TalentSearchQueryDto) {
    return this.talent.search(query.q, query.page, query.limit);
  }
}

@ApiTags('admin talent')
@ApiBearerAuth()
@Controller('admin/talent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminTalentController {
  constructor(private readonly talent: TalentService) {}

  @Get('spotlight')
  spotlight() {
    return this.talent.spotlight();
  }

  @Get()
  search(@Query() query: TalentSearchQueryDto) {
    return this.talent.search(query.q, query.page, query.limit);
  }

  @Get(':candidateId')
  detail(@Param('candidateId') candidateId: string) {
    return this.talent.detail(candidateId);
  }
}
