import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
