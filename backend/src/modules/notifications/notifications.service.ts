import { Injectable, NotFoundException } from '@nestjs/common';
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

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException();
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  setPreference(userId: string, dto: NotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: { userId, notificationType: dto.notificationType },
      },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
