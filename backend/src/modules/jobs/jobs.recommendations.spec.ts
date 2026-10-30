import { profileTerms, recommendationScore } from './jobs.recommendations';
import { JobsService, JobPostingPolicy } from './jobs.service';
import { PrismaService } from '../../prisma/prisma.service';

const profile = { headline: 'Senior Nurse', educations: [{ fieldOfStudy: 'Nursing' }], experiences: [], skills: [] };
const job = (title: string, category = 'Healthcare') => ({ title, category: { name: category }, educationRequirement: null, skills: [] });

describe('candidate job recommendations', () => {
  it('matches profession variants but not unrelated jobs sharing seniority', () => {
    const terms = profileTerms(profile);
    expect(recommendationScore(terms, new Set(), job('Industrial Clinic Nurse'))).toBeGreaterThan(0);
    expect(recommendationScore(terms, new Set(), job('Senior Accountant', 'Finance'))).toBe(0);
  });
  it('uses education and skills without a headline', () => {
    const terms = profileTerms({ ...profile, headline: null, educations: [{ fieldOfStudy: 'Civil Engineering' }] });
    expect(recommendationScore(terms, new Set(), job('Site Engineer', 'Construction'))).toBeGreaterThan(0);
    expect(recommendationScore(new Set(), new Set(['sql']), { ...job('Data Analyst'), skills: [{ skillId: 'sql' }] })).toBe(6);
  });
  it('ignores generic profile language', () => {
    expect(profileTerms({ ...profile, headline: 'Experienced senior professional', educations: [] }).size).toBe(0);
  });
  function setup(candidate: typeof profile | null, pool: object[] = []) {
    const prisma = {
      candidateProfile: { findUnique: vi.fn().mockResolvedValue(candidate) },
      job: { findMany: vi.fn().mockResolvedValueOnce(pool).mockResolvedValueOnce(pool) },
    };
    const service = new JobsService(prisma as unknown as PrismaService, {} as JobPostingPolicy);
    const fallback = vi.spyOn(service, 'listPublic').mockResolvedValue({ data: [], total: 0, page: 1, limit: 8 });
    return { service, prisma, fallback };
  }
  it('uses the signed-in profile and filters eligibility before ranking', async () => {
    const { service, prisma } = setup(profile, [{ id: 'nurse', ...job('Nurse') }]);
    const result = await service.recommendations('signed-in-user');
    expect(prisma.candidateProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'signed-in-user' } }));
    expect(prisma.job.findMany.mock.calls[0][0].where).toEqual({ status: 'published', postedAt: { not: null }, applicationDeadline: { gte: expect.any(Date) } });
    expect(result).toMatchObject({ personalized: true, data: [{ id: 'nurse' }] });
  });
  it('labels missing profiles without scanning for matches', async () => {
    const { service, prisma, fallback } = setup(null);
    expect(await service.recommendations('user')).toMatchObject({ personalized: false, reason: 'incomplete_profile' });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledWith({ limit: 8 });
  });
  it('labels no-match results as general picks', async () => {
    const { service } = setup(profile, [{ id: 'accountant', ...job('Accountant', 'Finance') }]);
    expect(await service.recommendations('user')).toMatchObject({ personalized: false, reason: 'no_matches' });
  });
});
