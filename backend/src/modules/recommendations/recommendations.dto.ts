import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRecommendationDto {
  @IsUUID()
  candidateId!: string;

  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class RespondRecommendationDto {
  @IsIn(['interested', 'declined'])
  status!: 'interested' | 'declined';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
