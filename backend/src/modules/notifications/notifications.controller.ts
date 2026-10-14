import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common/auth';
import { NotificationPreferenceDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
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
  setPreference(@CurrentUser() user: AuthUser, @Body() dto: NotificationPreferenceDto) {
    return this.notifications.setPreference(user.id, dto);
  }
}
