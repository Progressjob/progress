import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileCategory } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { AuthUser } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(ownerUserId: string, file: Express.Multer.File, category: FileCategory) {
    this.assertFile(file, category);
    const extension = extname(file.originalname).toLowerCase();
    const key = `${category}/${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;
    await this.storage.put(key, file.buffer);
    try {
      const created = await this.prisma.file.create({
        data: {
          ownerUserId,
          storageKey: key,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          fileCategory: category,
          isPrivate: category !== 'logo' && category !== 'profile_image',
        },
      });
      return { ...created, sizeBytes: Number(created.sizeBytes) };
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }

  async open(fileId: string, user?: AuthUser) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    if (file.isPrivate && !(await this.canRead(file.id, file.ownerUserId, user))) {
      throw new ForbiddenException('File access denied');
    }
    return { file, stream: this.storage.read(file.storageKey) };
  }

  async remove(fileId: string, user: AuthUser): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return;
    if (file.ownerUserId !== user.id && !user.roles.includes('admin')) {
      throw new ForbiddenException();
    }
    await this.prisma.file.delete({ where: { id: fileId } });
    await this.storage.delete(file.storageKey);
  }

  private async canRead(fileId: string, ownerUserId: string | null, user?: AuthUser) {
    if (!user) return false;
    if (ownerUserId === user.id || user.roles.some((r) => r === 'admin' || r === 'moderator')) {
      return true;
    }
    if (!user.roles.includes('employer')) return false;
    const companyDocument = await this.prisma.companyVerificationDocument.findFirst({
      where: { fileId, company: { members: { some: { userId: user.id, status: 'active' } } } },
      select: { id: true },
    });
    if (companyDocument) return true;
    const applied = await this.prisma.application.findFirst({
      where: {
        resume: { fileId },
        job: {
          company: {
            members: { some: { userId: user.id, status: 'active' } },
          },
        },
      },
      select: { id: true },
    });
    if (applied) return true;

    const visibleResume = await this.prisma.candidateResume.findFirst({
      where: {
        fileId,
        candidate: {
          profileVisibility: { in: ['public', 'employers'] },
          user: { accountStatus: 'active' },
        },
      },
      select: { id: true },
    });
    if (!visibleResume) return false;

    return Boolean(
      await this.prisma.companyMember.findFirst({
        where: { userId: user.id, status: 'active' },
        select: { id: true },
      }),
    );
  }

  private assertFile(file: Express.Multer.File, category: FileCategory): void {
    if (!file?.buffer?.length) throw new BadRequestException('A file is required');
    const signatures = {
      pdf: file.buffer.subarray(0, 5).toString() === '%PDF-',
      docx:
        file.buffer[0] === 0x50 &&
        file.buffer[1] === 0x4b &&
        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
          file.mimetype,
        ),
      doc:
        file.buffer.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1' &&
        file.mimetype === 'application/msword',
      image:
        file.buffer.subarray(0, 4).toString('hex').startsWith('89504e47') ||
        file.buffer.subarray(0, 3).toString('hex') === 'ffd8ff',
      svg:
        file.mimetype === 'image/svg+xml' &&
        file.buffer.toString('utf8', 0, 256).includes('<svg'),
    };
    const valid = category === 'cv' ? signatures.pdf || signatures.docx || signatures.doc : true;
    if (!valid) throw new BadRequestException('Unsupported or invalid file content');
    if (category === 'document' && !(
      (signatures.pdf && file.mimetype === 'application/pdf') ||
      (file.buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && file.mimetype === 'image/png') ||
      (file.buffer.subarray(0, 3).toString('hex') === 'ffd8ff' && file.mimetype === 'image/jpeg')
    )) throw new BadRequestException('Business documents must be PDF, PNG or JPEG files.');
    if (category === 'profile_image' && !signatures.image) {
      throw new BadRequestException('Only PNG and JPEG images are supported');
    }
    if (category === 'logo' && !signatures.image && !signatures.svg) {
      throw new BadRequestException('Only PNG, JPEG, and SVG images are supported');
    }
  }
}
