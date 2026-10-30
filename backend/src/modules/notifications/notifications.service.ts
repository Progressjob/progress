import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  NotificationAudienceDto,
  SendNotificationDto,
} from './notifications.dto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferenceDto } from './notifications.dto';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>('SMTP_PORT', 587),
          secure: false,
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASSWORD'),
          },
        })
      : nodemailer.createTransport({ jsonTransport: true });
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM', 'no-reply@example.com'),
      to,
      subject,
      text,
    });
  }
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  recipientSearch(q = '') {
    const term = q.trim();
    return this.prisma.user.findMany({
      where: {
        accountStatus: 'active',
        ...(term
          ? {
              OR: [
                { email: { contains: term, mode: 'insensitive' as const } },
                { firstName: { contains: term, mode: 'insensitive' as const } },
                { lastName: { contains: term, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: 'asc' }, { id: 'asc' }],
      take: 20,
    });
  }

  private audienceWhere(dto: NotificationAudienceDto): Prisma.UserWhereInput {
    if (dto.audience === 'selected' && !dto.userIds?.length)
      throw new BadRequestException('Select at least one recipient.');
    return {
      accountStatus: 'active',
      ...(dto.audience === 'selected'
        ? { id: { in: dto.userIds } }
        : { roles: { some: { role: { name: dto.audience } } } }),
    };
  }

  async previewAudience(dto: NotificationAudienceDto) {
    const where = this.audienceWhere(dto);
    const count = await this.prisma.user.count({ where });
    if (dto.audience === 'selected' && count !== new Set(dto.userIds).size)
      throw new BadRequestException(
        'Some selected accounts are unavailable. Refresh the recipients.',
      );
    return { count };
  }

  sentHistory() {
    return this.prisma.adminAuditLog.findMany({
      where: { action: 'notification_broadcast' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        details: true,
        actor: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async sendNotification(actorId: string, dto: SendNotificationDto) {
    const title = dto.title.trim();
    const message = dto.message.trim();
    if (!title || !message)
      throw new BadRequestException('Title and message are required.');
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          title,
          message,
          audience: dto.audience,
          ids: [...(dto.userIds ?? [])].sort(),
        }),
      )
      .digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        const previous = await tx.adminAuditLog.findUnique({
          where: { id: dto.requestId },
        });
        if (previous) {
          const details = previous.details as {
            requestHash?: string;
            recipientCount?: number;
          } | null;
          if (
            previous.actorUserId !== actorId ||
            previous.action !== 'notification_broadcast' ||
            details?.requestHash !== requestHash
          )
            throw new ConflictException(
              'This send request was already used for a different message.',
            );
          return {
            id: previous.id,
            recipientCount: details.recipientCount ?? 0,
          };
        }
        const users = await tx.user.findMany({
          where: this.audienceWhere(dto),
          select: { id: true },
        });
        if (!users.length)
          throw new BadRequestException(
            'No active recipients match this audience.',
          );
        if (
          users.length !== dto.expectedRecipientCount ||
          (dto.audience === 'selected' &&
            users.length !== new Set(dto.userIds).size)
        )
          throw new ConflictException(
            'The audience changed. Preview recipients again before sending.',
          );
        await tx.adminAuditLog.create({
          data: {
            id: dto.requestId,
            actorUserId: actorId,
            action: 'notification_broadcast',
            entityType: 'notification',
            entityId: dto.requestId,
            details: {
              title,
              message,
              audience: dto.audience,
              recipientCount: users.length,
              requestHash,
            },
          },
        });
        for (let start = 0; start < users.length; start += 500) {
          await tx.notification.createMany({
            data: users
              .slice(start, start + 500)
              .map(({ id }) => ({
                userId: id,
                title,
                message,
                type: 'admin_message',
                referenceType: 'broadcast',
                referenceId: dto.requestId,
              })),
          });
        }
        return { id: dto.requestId, recipientCount: users.length };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException();
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  setPreference(userId: string, dto: NotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType: dto.notificationType,
        },
      },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
