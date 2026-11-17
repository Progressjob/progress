import { TalentService } from './talent.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('talent contact masking', () => {
  it('hides phone and email for office candidates shown to employers', async () => {
    const prisma = {
      candidateProfile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'p1',
          source: 'office',
          headline: 'Nurse',
          summary: null,
          gender: null,
          country: 'Ethiopia',
          region: null,
          city: 'Bishoftu',
          yearsExperience: null,
          availabilityStatus: null,
          photoFileId: null,
          address: null,
          websiteUrl: null,
          careerLevel: null,
          managerialExperience: null,
          user: { firstName: 'Sara', lastName: 'T', email: 'sara@example.com', phone: '+251911223344' },
          educations: [],
          experiences: [],
          skills: [],
          certifications: [],
          languages: [],
          resumes: [],
        }),
      },
    };
    const service = new TalentService(prisma as unknown as PrismaService);
    const employerView = await service.detail('p1', { revealContact: false });
    expect(employerView.email).toBeNull();
    expect(employerView.phone).toBeNull();
    expect(employerView.contactViaProgress).toBe(true);
    const adminView = await service.detail('p1', { revealContact: true });
    expect(adminView.phone).toBe('+251911223344');
  });
});
