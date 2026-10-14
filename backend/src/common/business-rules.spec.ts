import { BadRequestException } from '@nestjs/common';
import { assertApplicationTransition } from '../modules/applications/applications.service';
import { assertJobTransition } from '../modules/jobs/jobs.service';
import { slugify } from './slug';

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
});
