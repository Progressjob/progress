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
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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

export class SendApplicationMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;
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
  @IsEnum(InterviewType)
  interviewType?: InterviewType;

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
