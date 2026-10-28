import { Prisma } from '@prisma/client';
import { diffJobContent, formatJobFieldValue, mergeJobSnapshot } from './jobs.revisions';

describe('job content revisions', () => {
  it('records a title change', () => {
    expect(
      diffJobContent({ title: 'Accountant' }, { title: 'Senior Accountant' }),
    ).toEqual([
      { field: 'title', label: 'Title', from: 'Accountant', to: 'Senior Accountant' },
    ]);
  });

  it('skips a save with no content changes', () => {
    const snapshot = {
      title: 'Accountant',
      employmentType: 'full_time',
      vacanciesCount: 1,
    };
    expect(diffJobContent(snapshot, snapshot)).toEqual([]);
  });

  it('treats deadline Date and ISO date as the same value', () => {
    expect(
      diffJobContent(
        { applicationDeadline: new Date('2026-12-31T00:00:00.000Z') },
        { applicationDeadline: '2026-12-31' },
      ),
    ).toEqual([]);
  });

  it('compares Prisma decimals with numbers', () => {
    expect(
      diffJobContent(
        { salaryMin: new Prisma.Decimal('25000.00'), experienceMinYears: new Prisma.Decimal('2.0') },
        { salaryMin: 30000, experienceMinYears: 2 },
      ),
    ).toEqual([{ field: 'salaryMin', label: 'Salary min', from: '25000', to: '30000' }]);
  });

  it('uses category and location names instead of ids', () => {
    expect(
      diffJobContent(
        { categoryId: 'cat-1', locationId: 'loc-1' },
        { categoryId: 'cat-2', locationId: 'loc-2' },
        {
          categoryFrom: 'Accounting',
          categoryTo: 'Finance',
          locationFrom: 'Addis Ababa',
          locationTo: 'Hawassa',
        },
      ),
    ).toEqual([
      { field: 'categoryId', label: 'Category', from: 'Accounting', to: 'Finance' },
      { field: 'locationId', label: 'Location', from: 'Addis Ababa', to: 'Hawassa' },
    ]);
  });

  it('humanizes employment and apply-method enums', () => {
    expect(formatJobFieldValue('employmentType', 'full_time')).toBe('Full time');
    expect(formatJobFieldValue('applicationMethod', 'admin')).toBe('Hire through Progress');
    expect(formatJobFieldValue('salaryVisibility', false)).toBe('No');
  });

  it('merges only defined patch fields', () => {
    const merged = mergeJobSnapshot(
      { title: 'Accountant', vacanciesCount: 1, summary: 'Keep books' },
      { title: 'Senior Accountant', summary: undefined },
    );
    expect(merged).toEqual({
      title: 'Senior Accountant',
      vacanciesCount: 1,
      summary: 'Keep books',
    });
  });
});
