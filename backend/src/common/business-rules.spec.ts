import { BadRequestException } from '@nestjs/common';
import {
  assertApplicationTransition,
  isOwnCompanyJob,
} from '../modules/applications/applications.service';
import { assertJobTransition } from '../modules/jobs/jobs.service';
import { nextUniqueSlug, slugify } from './slug';

describe('business rules', () => {
  it('normalizes URL slugs', () => {
    expect(slugify('  Senior Node.js Developer  ')).toBe('senior-node-js-developer');
  });

  it('allows the admin publication path', () => {
    expect(() => assertJobTransition('draft', 'published')).not.toThrow();
  });

  it('rejects editing the lifecycle of archived jobs', () => {
    expect(() => assertJobTransition('archived', 'published')).toThrow(BadRequestException);
  });

  it('supports the normal applicant pipeline', () => {
    expect(() => assertApplicationTransition('submitted', 'reviewing')).not.toThrow();
    expect(() => assertApplicationTransition('shortlisted', 'interview')).not.toThrow();
    expect(() => assertApplicationTransition('offered', 'hired')).not.toThrow();
  });

  it('protects terminal application statuses', () => {
    expect(() => assertApplicationTransition('hired', 'rejected')).toThrow(BadRequestException);
    expect(() => assertApplicationTransition('withdrawn', 'submitted')).toThrow(
      BadRequestException,
    );
  });

  it('blocks applying to a job from the same employer membership', () => {
    expect(isOwnCompanyJob('user-1', [{ userId: 'user-1' }, { userId: 'user-2' }])).toBe(true);
    expect(isOwnCompanyJob('user-3', [{ userId: 'user-1' }])).toBe(false);
  });

  it('increments taken employer slugs', async () => {
    const taken = new Set(['acme', 'acme-2']);
    await expect(nextUniqueSlug('Acme', async (slug) => taken.has(slug))).resolves.toBe('acme-3');
  });
});
