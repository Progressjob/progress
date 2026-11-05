import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProfileVisibility } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsString() careerLevel?: string;
  @IsOptional() @IsString() managerialExperience?: string;
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  yearsExperience?: number | null;
  @IsOptional() @IsNumber() @Min(0) currentSalary?: number;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() @IsNumber() @Min(0) expectedSalary?: number;
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(['full_time', 'part_time', 'internship', 'contract', 'remote', 'not_looking'])
  availabilityStatus?: string | null;
  @IsOptional() @IsEnum(ProfileVisibility) profileVisibility?: ProfileVisibility;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsUUID()
  photoFileId?: string | null;
}

export class EducationDto {
  @IsString() institution!: string;
  @IsOptional() @IsString() qualification?: string;
  @IsOptional() @IsString() fieldOfStudy?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateEducationDto extends PartialType(EducationDto) {}

export class ExperienceDto {
  @IsString() companyName!: string;
  @IsString() jobTitle!: string;
  @IsOptional() @IsString() workingCity?: string;
  @IsOptional() @IsString() salary?: string;
  @IsOptional() @IsString() employmentType?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() description?: string;
}
export class UpdateExperienceDto extends PartialType(ExperienceDto) {}

export class CandidateSkillDto {
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsUUID()
  skillId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() proficiencyLevel?: string;
  @IsOptional() @IsNumber() @Min(0) yearsExperience?: number;
}

export class CertificationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsString() credentialId?: string;
}
export class UpdateCertificationDto extends PartialType(CertificationDto) {}

export class LanguageDto {
  @IsString() name!: string;
  @IsOptional() @IsString() proficiency?: string;
  @IsOptional() @IsString() reading?: string;
  @IsOptional() @IsString() writing?: string;
  @IsOptional() @IsString() listening?: string;
}
export class UpdateLanguageDto extends PartialType(LanguageDto) {}

export class ReplaceCandidateSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSkillDto)
  skills!: CandidateSkillDto[];
}

export class ResumeMetaDto {
  @IsOptional()
  @IsString()
  title?: string;
}
