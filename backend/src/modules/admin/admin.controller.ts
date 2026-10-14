import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../common/auth';
import {
  ContactMessageDto,
  JobReportDto,
  UpdateContactDto,
  UpdateReportDto,
  UpdateUserStatusDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('public support')
@Controller()
export class PublicSupportController {
  constructor(private readonly admin: AdminService) {}

  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  contact(@Body() dto: ContactMessageDto) {
    return this.admin.contact(dto);
  }

  @Post('job-reports')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  report(@Body() dto: JobReportDto) {
    return this.admin.report(dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Patch('users/:id/status')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.admin.updateUser(id, dto);
  }

  @Get('reports')
  reports() {
    return this.admin.reports();
  }

  @Patch('reports/:id')
  report(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateReportDto,
  ) {
    return this.admin.updateReport(id, user.id, dto);
  }

  @Get('contact-messages')
  contacts() {
    return this.admin.contacts();
  }

  @Patch('contact-messages/:id')
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.admin.updateContact(id, dto);
  }

  @Get('audit-logs')
  auditLogs() {
    return this.admin.auditLogs();
  }
}
