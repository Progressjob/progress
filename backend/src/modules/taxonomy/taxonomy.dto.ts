import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class TaxonomyNameDto {
  @IsString()
  @Length(1, 150)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LocationDto {
  @IsString()
  @Length(1, 100)
  country!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  subCity?: string;

  @IsString()
  @Length(1, 200)
  name!: string;
}
