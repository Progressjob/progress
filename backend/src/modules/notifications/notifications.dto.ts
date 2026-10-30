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
} from 'class-validator';

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
