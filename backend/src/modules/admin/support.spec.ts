import { validateSync } from 'class-validator';
import { UpdateContactDto } from './admin.dto';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('support inbox', () => {
  it('accepts defined ticket states and rejects arbitrary values', () => {
    for (const status of ['new', 'in_progress', 'resolved']) {
      expect(
        validateSync(Object.assign(new UpdateContactDto(), { status })),
      ).toHaveLength(0);
    }
    expect(
      validateSync(Object.assign(new UpdateContactDto(), { status: 'bogus' })),
    ).not.toHaveLength(0);
  });
  it('stores the message and notifies reviewers in the same transaction', async () => {
    const tx = {
      contactMessage: { create: vi.fn().mockResolvedValue({ id: 'message' }) },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'admin' }]) },
      notification: { createMany: vi.fn() },
    };
    const db = { $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) };
    const service = new AdminService(db as unknown as PrismaService);
    const input = {
      name: 'User',
      email: 'user@example.com',
      subject: 'Need help',
      message: 'Please assist.',
    };
    await service.contact(input);
    expect(tx.contactMessage.create).toHaveBeenCalledWith({ data: input });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'admin',
          title: 'New support message',
          message: 'Need help',
          type: 'support_message',
          referenceType: 'contact',
          referenceId: 'message',
        },
      ],
    });
  });

  it('stores the signed-in reporter on a job report', async () => {
    const tx = {
      jobReport: { create: vi.fn().mockResolvedValue({ id: 'report' }) },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'admin' }]) },
      notification: { createMany: vi.fn() },
    };
    const db = { $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) };
    const service = new AdminService(db as unknown as PrismaService);
    const input = { jobId: 'job-1', reason: 'spam', description: 'Looks fake' };
    await service.report(input, 'user-1');
    expect(tx.jobReport.create).toHaveBeenCalledWith({
      data: { ...input, reportedBy: 'user-1' },
    });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'admin',
          title: 'Job reported',
          message: 'spam',
          type: 'job_report',
          referenceType: 'report',
          referenceId: 'report',
        },
      ],
    });
  });
});
