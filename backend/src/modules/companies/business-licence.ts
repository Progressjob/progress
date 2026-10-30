import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export async function requireBusinessLicence(prisma: PrismaService, fileId: string, ownerUserId: string) {
  if (!fileId) throw new BadRequestException('Upload a business licence before registering the company.');
  const file = await prisma.file.findFirst({
    where: { id: fileId, ownerUserId, fileCategory: 'document', isPrivate: true,
      mimeType: { in: ['application/pdf', 'image/png', 'image/jpeg'] } },
  });
  if (!file) throw new BadRequestException('Choose a PDF, PNG or JPEG business licence uploaded by your account.');
  return { create: { fileId: file.id, documentType: 'business_licence' } };
}
