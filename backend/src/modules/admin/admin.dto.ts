import { AccountStatus, ReportStatus } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class ContactMessageDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() subject!: string;
  @IsString() message!: string;
}

export class JobReportDto {
  @IsUUID() jobId!: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateReportDto {
  @IsEnum(ReportStatus) status!: ReportStatus;
}

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus) status!: AccountStatus;
}

export class CandidateApplicationAccessDto {
  @IsBoolean()
  blocked!: boolean;
}

export class UpdateContactDto {
  @IsString() status!: string;
  @IsOptional() @IsUUID() assignedTo?: string;
}
