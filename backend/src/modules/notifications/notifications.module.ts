import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { MailerService, NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailerService],
  exports: [NotificationsService, MailerService],
})
export class NotificationsModule {}
