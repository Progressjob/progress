import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProfileVisibility } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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
  @IsOptional() @IsNumber() @Min(0) yearsExperience?: number;
  @IsOptional() @IsNumber() @Min(0) currentSalary?: number;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() @IsNumber() @Min(0) expectedSalary?: number;
  @IsOptional() @IsString() availabilityStatus?: string;
  @IsOptional() @IsEnum(ProfileVisibility) profileVisibility?: ProfileVisibility;
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
  @IsOptional() @IsString() employmentType?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() description?: string;
}
export class UpdateExperienceDto extends PartialType(ExperienceDto) {}

export class CandidateSkillDto {
  @IsUUID() skillId!: string;
  @IsOptional() @IsString() proficiencyLevel?: string;
  @IsOptional() @IsNumber() @Min(0) yearsExperience?: number;
}

export class ReplaceCandidateSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSkillDto)
  skills!: CandidateSkillDto[];
}

export class ResumeMetaDto {
  @IsString()
  title!: string;
}
