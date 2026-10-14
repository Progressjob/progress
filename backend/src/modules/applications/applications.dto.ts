import { Type } from 'class-transformer';
import {
  ApplicationStatus,
  InterviewStatus,
  InterviewType,
} from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ApplicationAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsString()
  answerText!: string;
}

export class ApplyDto {
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers: ApplicationAnswerDto[] = [];
}

export class ChangeApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateInterviewDto {
  @IsEnum(InterviewType)
  interviewType!: InterviewType;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  locationOrLink?: string;
}

export class UpdateInterviewDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  locationOrLink?: string;

  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @IsOptional()
  @IsString()
  feedback?: string;
}
