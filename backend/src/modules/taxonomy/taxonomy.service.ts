import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/slug';
import { LocationDto, TaxonomyNameDto } from './taxonomy.dto';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.jobCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { children: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
  }

  listIndustries() {
    return this.prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listLocations() {
    return this.prisma.location.findMany({ orderBy: [{ country: 'asc' }, { name: 'asc' }] });
  }

  listSkills(query?: string) {
    return this.prisma.skill.findMany({
      where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  createCategory(dto: TaxonomyNameDto) {
    return this.prisma.jobCategory.create({
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        parentId: dto.parentId,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  updateCategory(id: string, dto: TaxonomyNameDto) {
    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        parentId: dto.parentId,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  createIndustry(dto: TaxonomyNameDto) {
    return this.prisma.industry.create({
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
    });
  }

  createLocation(dto: LocationDto) {
    return this.prisma.location.create({
      data: { ...dto, slug: slugify(`${dto.name}-${dto.region ?? dto.country}`) },
    });
  }

  createSkill(dto: TaxonomyNameDto) {
    return this.prisma.skill.create({ data: { name: dto.name.trim() } });
  }

  async remove(kind: 'categories' | 'industries' | 'locations' | 'skills', id: string) {
    const delegates = {
      categories: this.prisma.jobCategory,
      industries: this.prisma.industry,
      locations: this.prisma.location,
      skills: this.prisma.skill,
    };
    try {
      return await (delegates[kind] as typeof this.prisma.skill).delete({ where: { id } });
    } catch {
      throw new NotFoundException(`${kind} record not found or is in use`);
    }
  }
}
