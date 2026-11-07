import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { notifyReviewers, notifyCompanyMembers } from './notification-events';
import { PrismaService } from '../../prisma/prisma.service';

describe('notifications', () => {
  it('does not let one user mark another user notification as read', async () => {
    const db = {
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new NotificationsService(db as unknown as PrismaService);
    await expect(
      service.markRead('user-a', 'other-notification'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'other-notification', userId: 'user-a' },
    });
    expect(db.notification.update).not.toHaveBeenCalled();
  });
  it('marks only the current user unread notifications', async () => {
    const updateMany = vi.fn();
    const service = new NotificationsService({
      notification: { updateMany },
    } as unknown as PrismaService);
    await service.markAllRead('user-a');
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-a', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('marks unread notifications for a reference as read', async () => {
    const updateMany = vi.fn();
    const service = new NotificationsService({
      notification: { updateMany },
    } as unknown as PrismaService);
    await service.markReadByReference('user-a', 'candidates', 'co-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        readAt: null,
        referenceType: 'candidates',
        OR: [
          { referenceId: 'co-1' },
          { referenceId: { startsWith: 'co-1:' } },
        ],
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it('counts unread notifications filtered by reference', async () => {
    const count = vi.fn().mockResolvedValue(2);
    const service = new NotificationsService({
      notification: { count },
    } as unknown as PrismaService);
    await service.unreadCount('user-a', {
      referenceType: 'candidates',
      referenceId: 'co-1',
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        readAt: null,
        referenceType: 'candidates',
        OR: [
          { referenceId: 'co-1' },
          { referenceId: { startsWith: 'co-1:' } },
        ],
      },
    });
  });
  it('routes review events only to active administrators and moderators', async () => {
    const tx = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'admin' }]) },
      notification: { createMany: vi.fn() },
    };
    const event = {
      title: 'Review needed',
      message: 'Acme',
      type: 'company_review',
      referenceType: 'company',
      referenceId: 'co',
    };
    await notifyReviewers(tx as unknown as Prisma.TransactionClient, event);
    expect(tx.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          accountStatus: 'active',
          roles: { some: { role: { name: { in: ['admin', 'moderator'] } } } },
        },
      }),
    );
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [{ ...event, userId: 'admin' }],
    });
  });
  it('sends review decisions only to active members of the reviewed company', async () => {
    const tx = {
      companyMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'owner' }]),
      },
      notification: { createMany: vi.fn() },
    };
    const event = {
      title: 'Approved',
      message: 'Your company is approved.',
      type: 'company_verification',
      referenceType: 'company',
      referenceId: 'co',
    };
    await notifyCompanyMembers(
      tx as unknown as Prisma.TransactionClient,
      'co',
      event,
    );
    expect(tx.companyMember.findMany).toHaveBeenCalledWith({
      where: { companyId: 'co', status: 'active' },
      select: { userId: true },
    });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [{ ...event, userId: 'owner' }],
    });
  });
});
