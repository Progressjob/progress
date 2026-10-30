import { BadRequestException, ConflictException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import {
  NotificationAudienceDto,
  SendNotificationDto,
} from './notifications.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../../common/auth';

const draft: SendNotificationDto = {
  audience: 'selected',
  userIds: ['6d2eeb5a-631e-4b90-a4de-36eadb647312'],
  title: 'Welcome',
  message: 'Complete your profile.',
  requestId: '0ea6bcd5-7a8e-4ea9-8758-50bcfe0131d4',
  expectedRecipientCount: 1,
};
function setup(ids = draft.userIds!) {
  const logs = new Map<string, any>();
  const tx = {
    user: { findMany: vi.fn().mockResolvedValue(ids.map((id) => ({ id }))) },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: ids.length }),
    },
    adminAuditLog: {
      findUnique: vi.fn(async ({ where }) => logs.get(where.id)),
      create: vi.fn(async ({ data }) => {
        logs.set(data.id, data);
        return data;
      }),
    },
  };
  const service = new NotificationsService({
    $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService);
  return { service, tx };
}
describe('admin notification sending', () => {
  it('restricts sending, audience preview, lookup and sent history to platform staff', () => {
    for (const name of ['send', 'preview', 'recipients', 'sent'] as const) {
      expect(
        Reflect.getMetadata(ROLES_KEY, NotificationsController.prototype[name]),
      ).toEqual(['admin', 'moderator']);
    }
  });
  it('rejects empty and duplicate selected recipients', () => {
    expect(
      validateSync(
        Object.assign(new NotificationAudienceDto(), {
          audience: 'selected',
          userIds: [],
        }),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateSync(
        Object.assign(new NotificationAudienceDto(), {
          audience: 'selected',
          userIds: [...draft.userIds!, ...draft.userIds!],
        }),
      ).length,
    ).toBeGreaterThan(0);
  });
  it('delivers once and records the sender and count', async () => {
    const { service, tx } = setup();
    expect(await service.sendNotification('admin', draft)).toEqual({
      id: draft.requestId,
      recipientCount: 1,
    });
    await service.sendNotification('admin', draft);
    expect(tx.notification.createMany).toHaveBeenCalledTimes(1);
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: draft.userIds![0],
          title: draft.title,
          message: draft.message,
          type: 'admin_message',
          referenceType: 'broadcast',
          referenceId: draft.requestId,
        },
      ],
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: 'admin',
          details: expect.objectContaining({ recipientCount: 1 }),
        }),
      }),
    );
  });
  it('refuses to reuse a successful request for different content', async () => {
    const { service } = setup();
    await service.sendNotification('admin', draft);
    await expect(
      service.sendNotification('admin', { ...draft, title: 'Different' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('requires a fresh preview if the active audience changes', async () => {
    const { service, tx } = setup(['one', 'two']);
    await expect(
      service.sendNotification('admin', {
        ...draft,
        audience: 'employer',
        userIds: undefined,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it.each(['employer', 'candidate'] as const)(
    'scopes %s audience to active accounts with that role',
    async (audience) => {
      const { service, tx } = setup();
      await service.sendNotification('admin', {
        ...draft,
        audience,
        userIds: undefined,
      });
      expect(tx.user.findMany).toHaveBeenCalledWith({
        where: {
          accountStatus: 'active',
          roles: { some: { role: { name: audience } } },
        },
        select: { id: true },
      });
    },
  );
  it('does not accept whitespace-only message content', async () => {
    const { service } = setup();
    await expect(
      service.sendNotification('admin', { ...draft, message: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
