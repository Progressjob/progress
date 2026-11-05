import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const WORK_STATUS_FILTERS = [
  'full_time',
  'part_time',
  'internship',
  'contract',
  'remote',
  'not_looking',
] as const;

export class TalentSearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(WORK_STATUS_FILTERS)
  availabilityStatus?: (typeof WORK_STATUS_FILTERS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
