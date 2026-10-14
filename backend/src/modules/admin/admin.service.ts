import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContactMessageDto,
  JobReportDto,
  UpdateContactDto,
  UpdateReportDto,
  UpdateUserStatusDto,
} from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  contact(dto: ContactMessageDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  report(dto: JobReportDto) {
    return this.prisma.jobReport.create({ data: dto });
  }

  async dashboard() {
    const [companies, jobs, candidates, applications, pendingReports] =
      await this.prisma.$transaction([
        this.prisma.company.count(),
        this.prisma.job.count(),
        this.prisma.candidateProfile.count(),
        this.prisma.application.count(),
        this.prisma.jobReport.count({ where: { status: 'pending' } }),
      ]);
    return { companies, jobs, candidates, applications, pendingReports };
  }

  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        accountStatus: true,
        createdAt: true,
        roles: { select: { role: true } },
      },
    });
  }

  updateUser(id: string, dto: UpdateUserStatusDto) {
    return this.prisma.user.update({ where: { id }, data: { accountStatus: dto.status } });
  }

  reports() {
    return this.prisma.jobReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { job: { include: { company: true } }, reporter: true, reviewer: true },
    });
  }

  updateReport(id: string, reviewerId: string, dto: UpdateReportDto) {
    return this.prisma.jobReport.update({
      where: { id },
      data: { status: dto.status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
  }

  contacts() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  updateContact(id: string, dto: UpdateContactDto) {
    return this.prisma.contactMessage.update({ where: { id }, data: dto });
  }

  auditLogs() {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
