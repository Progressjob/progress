import { ConflictException } from '@nestjs/common';
import { OfficeCandidatesService } from './office-candidates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';

function service(prisma: Record<string, unknown>) {
  return new OfficeCandidatesService(prisma as unknown as PrismaService, {} as FilesService);
}

describe('office candidate registration', () => {
  it('rejects a phone that is already registered', async () => {
    const prisma = {
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
      candidateProfile: { findFirst: vi.fn() },
    };
    await expect(service(prisma).create('admin', {
      firstName: 'Abebe',
      lastName: 'Kebede',
      phone: '0911223344',
      consent: true,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a FAN that is already registered', async () => {
    const prisma = {
      user: { findFirst: vi.fn().mockResolvedValue(null) },
      candidateProfile: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    };
    await expect(service(prisma).create('admin', {
      firstName: 'Abebe',
      lastName: 'Kebede',
      phone: '+251911223344',
      nationalId: 'FAN-1',
      consent: true,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.candidateProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { nationalId: 'FAN-1' },
    }));
  });
});
