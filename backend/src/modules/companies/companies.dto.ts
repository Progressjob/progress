import { CompanyMemberRole, MembershipStatus, VerificationStatus } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import {
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
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsEnum(CompanyMemberRole)
  memberRole!: CompanyMemberRole;
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
