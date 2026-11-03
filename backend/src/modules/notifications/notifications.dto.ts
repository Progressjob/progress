import {
  IsBoolean,
  IsOptional,
  IsString,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsUUID,
  ValidateIf,
  Length,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Inbox categories mapped from notification type / reference. */
export const NOTIFICATION_CATEGORIES = [
  'all',
  'support',
  'reports',
  'companies',
  'jobs',
  'applications',
  'messages',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  q?: string;

  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategory;

  @IsOptional()
  @IsBooleanString()
  unread?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** ISO timestamp cursor — return items older than this createdAt. */
  @IsOptional()
  @IsDateString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class NotificationPreferenceDto {
  @IsString()
  notificationType!: string;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}

export class NotificationAudienceDto {
  @IsIn(['selected', 'employer', 'candidate'])
  audience!: 'selected' | 'employer' | 'candidate';

  @ValidateIf(
    (dto: NotificationAudienceDto) =>
      dto.audience === 'selected' || dto.userIds !== undefined,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  userIds?: string[];
}

export class SendNotificationDto extends NotificationAudienceDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 5000)
  message!: string;

  @IsUUID()
  requestId!: string;

  @IsInt()
  @Min(1)
  expectedRecipientCount!: number;
}
