import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { nextUniqueSlug, slugify } from '../../common/slug';
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

  listAllCategories() {
    return this.prisma.jobCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { jobs: true, children: true } },
      },
    });
  }

  listAllIndustries() {
    return this.prisma.industry.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { companies: true, children: true } },
      },
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

  private uniqueCategorySlug(name: string, excludeId?: string) {
    return nextUniqueSlug(name, async (slug) => {
      const existing = await this.prisma.jobCategory.findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      return Boolean(existing);
    });
  }

  private uniqueIndustrySlug(name: string, excludeId?: string) {
    return nextUniqueSlug(name, async (slug) => {
      const existing = await this.prisma.industry.findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      return Boolean(existing);
    });
  }

  async createCategory(dto: TaxonomyNameDto) {
    const slug = await this.uniqueCategorySlug(dto.name);
    return this.prisma.jobCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { jobs: true, children: true } } },
    });
  }

  async updateCategory(id: string, dto: TaxonomyNameDto) {
    const existing = await this.prisma.jobCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    const name = dto.name.trim();
    const slug =
      name === existing.name ? existing.slug : await this.uniqueCategorySlug(name, id);

    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: dto.parentId,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { _count: { select: { jobs: true, children: true } } },
    });
  }

  async createIndustry(dto: TaxonomyNameDto) {
    const slug = await this.uniqueIndustrySlug(dto.name);
    return this.prisma.industry.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { companies: true, children: true } } },
    });
  }

  async updateIndustry(id: string, dto: TaxonomyNameDto) {
    const existing = await this.prisma.industry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Industry not found');

    const name = dto.name.trim();
    const slug =
      name === existing.name ? existing.slug : await this.uniqueIndustrySlug(name, id);

    return this.prisma.industry.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
      include: { _count: { select: { companies: true, children: true } } },
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
    if (kind === 'categories') {
      const item = await this.prisma.jobCategory.findUnique({
        where: { id },
        include: { _count: { select: { jobs: true, children: true } } },
      });
      if (!item) throw new NotFoundException('Category not found');
      if (item._count.jobs > 0) {
        throw new ConflictException(
          `Cannot delete "${item.name}" because ${item._count.jobs} job(s) still use it. Deactivate it instead.`,
        );
      }
      if (item._count.children > 0) {
        throw new ConflictException(
          `Cannot delete "${item.name}" because it has child categories. Remove or reassign children first.`,
        );
      }
      return this.prisma.jobCategory.delete({ where: { id } });
    }

    if (kind === 'industries') {
      const item = await this.prisma.industry.findUnique({
        where: { id },
        include: { _count: { select: { companies: true, children: true } } },
      });
      if (!item) throw new NotFoundException('Industry not found');
      if (item._count.companies > 0) {
        throw new ConflictException(
          `Cannot delete "${item.name}" because ${item._count.companies} company(ies) still use it. Deactivate it instead.`,
        );
      }
      if (item._count.children > 0) {
        throw new ConflictException(
          `Cannot delete "${item.name}" because it has child industries. Remove or reassign children first.`,
        );
      }
      return this.prisma.industry.delete({ where: { id } });
    }

    try {
      if (kind === 'locations') {
        return await this.prisma.location.delete({ where: { id } });
      }
      return await this.prisma.skill.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException(`${kind} record not found`);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException(`${kind} record is in use and cannot be deleted`);
      }
      throw err;
    }
  }
}
