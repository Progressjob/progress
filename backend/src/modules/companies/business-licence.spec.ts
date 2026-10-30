import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { requireBusinessLicence } from './business-licence';
import { CompaniesService } from './companies.service';
import { JobPostingPolicy } from '../jobs/jobs.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../files/storage.service';

const asPrisma = (value: unknown) => value as PrismaService;

describe('business licence verification', () => {
  it('requires a private document belonging to the registering account', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(requireBusinessLicence(asPrisma({ file: { findFirst } }), 'another-users-file', 'owner')).rejects.toBeInstanceOf(BadRequestException);
    expect(findFirst).toHaveBeenCalledWith({ where: {
      id: 'another-users-file', ownerUserId: 'owner', fileCategory: 'document', isPrivate: true,
      mimeType: { in: ['application/pdf', 'image/png', 'image/jpeg'] },
    } });
  });
  it.each(['pending', 'rejected'])('blocks posting for %s companies even with direct-publishing enabled', async (status) => {
    const policy = new JobPostingPolicy(asPrisma({ company: { findUnique: vi.fn().mockResolvedValue({
      verificationStatus: status, canSelfPublishJobs: true, portalStatus: 'active', logoFileId: 'logo',
    }) } }));
    await expect(policy.assertCanPost('company')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows approved companies to create jobs without automatically granting direct publishing', async () => {
    const policy = new JobPostingPolicy(asPrisma({ company: { findUnique: vi.fn().mockResolvedValue({
      verificationStatus: 'verified', canSelfPublishJobs: false, portalStatus: 'active', logoFileId: 'logo',
    }) } }));
    expect(await policy.getCompanyPostingContext('company')).toMatchObject({ canSelfPublish: false });
  });
  it('admin registration cannot skip review with verify or direct-publish flags', async () => {
    const tx = {
      company: { create: vi.fn().mockResolvedValue({ id: 'company' }) },
      role: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
      user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ id: 'owner' }) },
      userRole: { upsert: vi.fn() },
      companyMember: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    };
    const service = new CompaniesService(asPrisma({
      file: { findFirst: vi.fn().mockResolvedValue({ id: 'licence' }) },
      company: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
    }));
    await service.provision('admin', {
      company: { name: 'Acme', logoFileId: 'logo', businessLicenceFileId: 'licence' },
      employer: { email: 'owner@example.com', temporaryPassword: 'Password123!' },
      verify: true, canSelfPublishJobs: true,
    });
    expect(tx.company.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      verificationStatus: 'pending', canSelfPublishJobs: false,
      documents: { create: { fileId: 'licence', documentType: 'business_licence' } },
    }) }));
  });
  it('requires a rejection reason and refuses to review an outdated licence', async () => {
    const tx = { companyVerificationDocument: { findFirst: vi.fn().mockResolvedValue({ id: 'latest' }) } };
    const service = new CompaniesService(asPrisma({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) }));
    await expect(service.verify('company', { status: 'rejected' }, 'admin')).rejects.toThrow('Explain why');
    await expect(service.verify('company', { status: 'verified', documentId: 'old' }, 'admin')).rejects.toThrow('licence changed');
  });
  it('cannot approve a company without a licence', async () => {
    const tx = { companyVerificationDocument: { findFirst: vi.fn().mockResolvedValue(null) }, company: { update: vi.fn() } };
    const service = new CompaniesService(asPrisma({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) }));
    await expect(service.verify('company', { status: 'verified' }, 'reviewer')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.company.update).not.toHaveBeenCalled();
  });
  it('records the reviewer and approves the submitted licence and company together', async () => {
    const tx = {
      companyVerificationDocument: { findFirst: vi.fn().mockResolvedValue({ id: 'licence' }), update: vi.fn() },
      company: { update: vi.fn().mockResolvedValue({ verificationStatus: 'verified' }) },
      companyMember: { findMany: vi.fn().mockResolvedValue([{ userId: 'owner' }]) },
      notification: { createMany: vi.fn() },
    };
    const service = new CompaniesService(asPrisma({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) }));
    await service.verify('company', { status: 'verified' }, 'reviewer');
    expect(tx.companyVerificationDocument.update).toHaveBeenCalledWith({ where: { id: 'licence' }, data: {
      reviewStatus: 'verified', reviewedBy: 'reviewer', reviewedAt: expect.any(Date), reviewNote: null,
    } });
    expect(tx.company.update).toHaveBeenCalledWith(expect.objectContaining({ data: { verificationStatus: 'verified', verifiedAt: expect.any(Date) } }));
  });
  it('replacing a rejected licence resets review and direct publishing', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'company', name: 'Acme' });
    const tx = { company: { update }, user: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new CompaniesService(asPrisma({ file: { findFirst: vi.fn().mockResolvedValue({ id: 'new-file' }) }, $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) }));
    await service.employerUpdate('owner', 'company', { businessLicenceFileId: 'new-file' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      verificationStatus: 'pending', verifiedAt: null, canSelfPublishJobs: false,
      documents: { create: { fileId: 'new-file', documentType: 'business_licence' } },
    }) }));
  });
  it('rejects forged document uploads before storing them', async () => {
    const put = vi.fn();
    const service = new FilesService(asPrisma({}), { put } as unknown as StorageService);
    await expect(service.upload('owner', {
      originalname: 'licence.pdf', mimetype: 'application/pdf', buffer: Buffer.from('<html>not a PDF</html>'), size: 22,
    } as Express.Multer.File, 'document')).rejects.toBeInstanceOf(BadRequestException);
    expect(put).not.toHaveBeenCalled();
  });
  it('never exposes private documents through the public file route', async () => {
    const read = vi.fn();
    const service = new FilesService(asPrisma({ file: { findUnique: vi.fn().mockResolvedValue({
      id: 'licence', isPrivate: true, ownerUserId: 'owner',
    }) } }), { read } as unknown as StorageService);
    await expect(service.open('licence')).rejects.toBeInstanceOf(ForbiddenException);
    expect(read).not.toHaveBeenCalled();
  });
});
