import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ApplicationMethod,
  EmploymentType,
  QuestionType,
  WorkplaceType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

export class CreateJobDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  educationRequirement?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceMinYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceMaxYears?: number;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsOptional()
  @IsString()
  careerLevel?: string;

  @IsEnum(WorkplaceType)
  workplaceType!: WorkplaceType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsOptional()
  @IsBoolean()
  salaryVisibility?: boolean;

  @IsInt()
  @Min(1)
  @Max(10000)
  vacanciesCount = 1;

  @IsIn(['email', 'admin'])
  applicationMethod!: Extract<ApplicationMethod, 'email' | 'admin'>;

  @ValidateIf((o: CreateJobDto) => o.applicationMethod === 'email' && Boolean(o.applicationEmail?.trim()))
  @IsEmail()
  applicationEmail?: string;

  @IsOptional()
  @IsString()
  applicationInstructions?: string;

  @IsDateString()
  applicationDeadline!: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isEasyApply?: boolean;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}

/** Company portal create — companyId comes from the URL, not the body. */
export class EmployerCreateJobDto extends OmitType(CreateJobDto, ['companyId'] as const) {}

export class EmployerUpdateJobDto extends OmitType(UpdateJobDto, ['companyId'] as const) {}

export class EmployerReopenJobDto {
  @IsDateString()
  applicationDeadline!: string;
}

export class ScreeningQuestionDto {
  @IsString()
  questionText!: string;

  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @IsOptional()
  @IsArray()
  options?: unknown[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsInt()
  @Min(0)
  sortOrder = 0;
}

export class ReplaceScreeningDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ScreeningQuestionDto)
  questions!: ScreeningQuestionDto[];
}

export class JobSkillDto {
  @IsUUID()
  skillId!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class ReplaceJobSkillsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => JobSkillDto)
  skills!: JobSkillDto[];
}
