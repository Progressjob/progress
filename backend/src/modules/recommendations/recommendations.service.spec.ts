import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TalentService } from '../talent/talent.service';

describe('candidate recommendations', () => {
  it('notifies every active company member when an admin recommends someone', async () => {
    const created = { id: 'rec-1', candidateId: 'cand', companyId: 'co' };
    const tx = {
      candidateRecommendation: { create: vi.fn().mockResolvedValue(created) },
      companyMember: { findMany: vi.fn().mockResolvedValue([{ userId: 'm1' }, { userId: 'm2' }]) },
      notification: { createMany: vi.fn() },
    };
    const prisma = {
      candidateProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'cand', user: { firstName: 'Ada', lastName: 'L' } }) },
      company: { findUnique: vi.fn().mockResolvedValue({ id: 'co', name: 'Acme' }) },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    };
    const service = new RecommendationsService(prisma as unknown as PrismaService, {} as TalentService);
    await service.create('admin', { candidateId: 'cand', companyId: 'co', note: 'Strong fit' });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'm1', referenceType: 'recommendation', referenceId: 'co:rec-1' }),
        expect.objectContaining({ userId: 'm2', referenceType: 'recommendation' }),
      ],
    });
  });

  it('hides a recommendation that belongs to another company', async () => {
    const prisma = {
      candidateRecommendation: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new RecommendationsService(prisma as unknown as PrismaService, {} as TalentService);
    await expect(service.respond('other-company', 'rec-1', { status: 'interested' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
