import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../common/auth';
import {
  ListNotificationsQueryDto,
  MarkNotificationsByReferenceDto,
  NotificationAudienceDto,
  SendNotificationDto,
  NotificationPreferenceDto,
  UnreadCountQueryDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('admin/recipients')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  recipients(@Query('q') q?: string) {
    return this.notifications.recipientSearch(q);
  }

  @Post('admin/preview')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  preview(@Body() dto: NotificationAudienceDto) {
    return this.notifications.previewAudience(dto);
  }

  @Post('admin/send')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendNotificationDto) {
    return this.notifications.sendNotification(user.id, dto);
  }

  @Get('admin/sent')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  sent() {
    return this.notifications.sentHistory();
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  unreadCount(
    @CurrentUser() user: AuthUser,
    @Query() query: UnreadCountQueryDto,
  ) {
    return this.notifications.unreadCount(user.id, {
      referenceType: query.referenceType,
      referenceId: query.referenceId,
    });
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch('read-by-reference')
  markReadByReference(
    @CurrentUser() user: AuthUser,
    @Body() dto: MarkNotificationsByReferenceDto,
  ) {
    return this.notifications.markReadByReference(
      user.id,
      dto.referenceType,
      dto.referenceId,
    );
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Get('preferences/all')
  preferences(@CurrentUser() user: AuthUser) {
    return this.notifications.preferences(user.id);
  }

  @Put('preferences')
  setPreference(
    @CurrentUser() user: AuthUser,
    @Body() dto: NotificationPreferenceDto,
  ) {
    return this.notifications.setPreference(user.id, dto);
  }
}
