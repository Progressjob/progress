import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SavedJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.savedJob.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: { job: { include: { company: true, category: true, location: true } } },
    });
  }

  async save(userId: string, jobId: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.savedJob.upsert({
      where: { candidateId_jobId: { candidateId, jobId } },
      create: { candidateId, jobId },
      update: {},
    });
  }

  async remove(userId: string, jobId: string) {
    const candidateId = await this.candidateId(userId);
    await this.prisma.savedJob.deleteMany({ where: { candidateId, jobId } });
  }

  private async candidateId(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();
    return candidate.id;
  }
}
