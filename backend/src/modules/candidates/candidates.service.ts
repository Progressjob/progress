import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CertificationDto,
  EducationDto,
  ExperienceDto,
  LanguageDto,
  ReplaceCandidateSkillsDto,
  UpdateCertificationDto,
  UpdateEducationDto,
  UpdateExperienceDto,
  UpdateLanguageDto,
  UpdateProfileDto,
} from './candidates.dto';

const profileInclude = {
  user: { select: { firstName: true, lastName: true, email: true, phone: true } },
  photo: { select: { id: true, originalFilename: true, mimeType: true } },
  educations: { orderBy: { startDate: 'desc' as const } },
  experiences: { orderBy: { startDate: 'desc' as const } },
  skills: { include: { skill: true } },
  certifications: { orderBy: { issuedDate: 'desc' as const } },
  languages: { orderBy: { name: 'asc' as const } },
  resumes: {
    include: {
      file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  profile(userId: string) {
    return this.prisma.candidateProfile.findUniqueOrThrow({
      where: { userId },
      include: profileInclude,
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { firstName, lastName, phone, photoFileId, ...profileDto } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(firstName !== undefined ? { firstName: firstName.trim() } : {}),
            ...(lastName !== undefined ? { lastName: lastName.trim() } : {}),
            ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
          },
        });
      }
      return tx.candidateProfile.update({
        where: { userId },
        data: {
          ...profileDto,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          ...(photoFileId !== undefined ? { photoFileId: photoFileId || null } : {}),
        },
        include: profileInclude,
      });
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
        startDate: dto.startDate
          ? new Date(dto.startDate)
          : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
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
      const resolved: Array<{
        candidateId: string;
        skillId: string;
        proficiencyLevel?: string;
        yearsExperience?: number;
      }> = [];
      for (const item of dto.skills) {
        const name = item.name?.trim();
        let skillId = item.skillId;
        if (!skillId && name) {
          const existing = await tx.skill.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
          });
          skillId = existing?.id ?? (await tx.skill.create({ data: { name } })).id;
        }
        if (!skillId) {
          throw new BadRequestException('Each skill needs a name or skillId');
        }
        resolved.push({
          candidateId,
          skillId,
          proficiencyLevel: item.proficiencyLevel,
          yearsExperience: item.yearsExperience,
        });
      }
      await tx.candidateSkill.deleteMany({ where: { candidateId } });
      if (resolved.length) {
        await tx.candidateSkill.createMany({ data: resolved });
      }
      return tx.candidateSkill.findMany({ where: { candidateId }, include: { skill: true } });
    });
  }

  async addCertification(userId: string, dto: CertificationDto) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateCertification.create({
      data: {
        candidateId,
        name: dto.name,
        issuer: dto.issuer,
        credentialId: dto.credentialId,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
      },
    });
  }

  async updateCertification(userId: string, id: string, dto: UpdateCertificationDto) {
    const candidateId = await this.candidateId(userId);
    const found = await this.prisma.candidateCertification.findFirst({ where: { id, candidateId } });
    if (!found) throw new NotFoundException();
    return this.prisma.candidateCertification.update({
      where: { id },
      data: {
        ...dto,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
      },
    });
  }

  async deleteCertification(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateCertification.delete({ where: { id, candidateId } });
  }

  async addLanguage(userId: string, dto: LanguageDto) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateLanguage.create({
      data: {
        candidateId,
        name: dto.name.trim(),
        proficiency: dto.proficiency,
        reading: dto.reading,
        writing: dto.writing,
        listening: dto.listening,
      },
    });
  }

  async updateLanguage(userId: string, id: string, dto: UpdateLanguageDto) {
    const candidateId = await this.candidateId(userId);
    const found = await this.prisma.candidateLanguage.findFirst({ where: { id, candidateId } });
    if (!found) throw new NotFoundException();
    return this.prisma.candidateLanguage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.proficiency !== undefined ? { proficiency: dto.proficiency } : {}),
        ...(dto.reading !== undefined ? { reading: dto.reading } : {}),
        ...(dto.writing !== undefined ? { writing: dto.writing } : {}),
        ...(dto.listening !== undefined ? { listening: dto.listening } : {}),
      },
    });
  }

  async deleteLanguage(userId: string, id: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateLanguage.delete({ where: { id, candidateId } });
  }

  async addResume(userId: string, fileId: string, title: string) {
    const candidateId = await this.candidateId(userId);
    const count = await this.prisma.candidateResume.count({ where: { candidateId } });
    return this.prisma.candidateResume.create({
      data: { candidateId, fileId, title, isDefault: count === 0 },
      include: {
        file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } },
      },
    });
  }

  async listResumes(userId: string) {
    const candidateId = await this.candidateId(userId);
    return this.prisma.candidateResume.findMany({
      where: { candidateId },
      include: {
        file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } },
      },
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
