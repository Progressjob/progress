import {
  CompanyMemberRole,
  CompanyPortalStatus,
  MembershipStatus,
  VerificationStatus,
} from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CompanyDto {
  @IsString()
  @Length(2, 255)
  name!: string;

  @IsOptional()
  @IsUUID()
  industryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateIf((o: CompanyDto) => Boolean(o.websiteUrl?.trim()))
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2200)
  foundedYear?: number;

  @IsOptional()
  @IsUUID()
  logoFileId?: string;
}

export class UpdateCompanyDto extends PartialType(CompanyDto) {}

export class CreateEmployerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(CompanyMemberRole)
  memberRole?: CompanyMemberRole;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}

export class VerifyCompanyDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;
}

export class CompanyPostingAccessDto {
  @IsBoolean()
  canSelfPublishJobs!: boolean;
}

export class CompanyPortalStatusDto {
  @IsEnum(CompanyPortalStatus)
  status!: CompanyPortalStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  reason?: string;
}

export class ProvisionCompanyDto {
  @ValidateNested()
  @Type(() => CompanyDto)
  company!: CompanyDto;

  @ValidateNested()
  @Type(() => CreateEmployerDto)
  employer!: CreateEmployerDto;

  @IsOptional()
  @IsBoolean()
  verify?: boolean;

  @IsOptional()
  @IsBoolean()
  canSelfPublishJobs?: boolean;
}
