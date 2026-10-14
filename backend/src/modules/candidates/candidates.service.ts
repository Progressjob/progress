import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EducationDto,
  ExperienceDto,
  ReplaceCandidateSkillsDto,
  UpdateEducationDto,
  UpdateExperienceDto,
  UpdateProfileDto,
} from './candidates.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  profile(userId: string) {
    return this.prisma.candidateProfile.findUniqueOrThrow({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        educations: { orderBy: { startDate: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
        resumes: { include: { file: true }, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.candidateProfile.update({
      where: { userId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async addEducation(userId: string, dto: EducationDto) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateEducation.create({
      data: {
        ...dto,
        candidateId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updateEducation(userId: string, id: string, dto: UpdateEducationDto) {
    const candidateId = await this.candidateId(userId);
    const found = await this.prisma.candidateEducation.findFirst({ where: { id, candidateId } });
    if (!found) throw new NotFoundException();
    return this.prisma.candidateEducation.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async deleteEducation(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateEducation.delete({ where: { id, candidateId } });
  }

  async addExperience(userId: string, dto: ExperienceDto) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateExperience.create({
      data: {
        ...dto,
        candidateId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updateExperience(userId: string, id: string, dto: UpdateExperienceDto) {
    const candidateId = await this.candidateId(userId);
    const found = await this.prisma.candidateExperience.findFirst({ where: { id, candidateId } });
    if (!found) throw new NotFoundException();
    return this.prisma.candidateExperience.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async deleteExperience(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateExperience.delete({ where: { id, candidateId } });
  }

  async replaceSkills(userId: string, dto: ReplaceCandidateSkillsDto) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.candidateSkill.deleteMany({ where: { candidateId } });
      if (dto.skills.length) {
        await tx.candidateSkill.createMany({
          data: dto.skills.map((skill) => ({ candidateId, ...skill })),
        });
      }
      return tx.candidateSkill.findMany({ where: { candidateId }, include: { skill: true } });
    });
  }

  async addResume(userId: string, fileId: string, title: string) {
    const candidateId = await this.candidateId(userId);
    const count = await this.prisma.candidateResume.count({ where: { candidateId } });
    return this.prisma.candidateResume.create({
      data: { candidateId, fileId, title, isDefault: count === 0 },
      include: { file: true },
    });
  }

  async listResumes(userId: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateResume.findMany({
      where: { candidateId },
      include: { file: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setDefaultResume(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    const found = await this.prisma.candidateResume.findFirst({ where: { id, candidateId } });
    if (!found) throw new NotFoundException();
    return this.prisma.$transaction(async (tx) => {
      await tx.candidateResume.updateMany({
        where: { candidateId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.candidateResume.update({ where: { id }, data: { isDefault: true } });
    });
  }

  async deleteResume(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    const resume = await this.prisma.candidateResume.findFirst({
      where: { id, candidateId },
      include: { _count: { select: { applications: true } } },
    });
    if (!resume) throw new NotFoundException();
    if (resume._count.applications) {
      throw new ConflictException('A resume used by an application must be retained');
    }
    return this.prisma.candidateResume.delete({ where: { id } });
  }

  private async candidateId(userId: string): Promise<string> {
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException('Candidate profile not found');
    return candidate.id;
  }
}
