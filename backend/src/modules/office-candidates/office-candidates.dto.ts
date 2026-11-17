import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const OFFICE_STATUSES = ['new', 'negotiating', 'ready', 'placed'] as const;
export type OfficeStatus = (typeof OFFICE_STATUSES)[number];

export class OfficeCandidateFieldsDto {
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsString()
  @Length(9, 30)
  phone!: string;

  @IsOptional()
  @ValidateIf((_, v) => typeof v === 'string' && v.length > 0)
  @Matches(/^\d{16}$/, { message: 'National ID FAN number must be exactly 16 digits' })
  nationalId?: string;
  @IsOptional() @IsString() @MaxLength(200) headline?: string;
  @IsOptional() @IsString() @MaxLength(30) gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @Type(() => Number) @IsNumber() expectedSalary?: number;
  @IsBoolean() consent!: boolean;
  @IsOptional() @IsIn(OFFICE_STATUSES) officeStatus?: OfficeStatus;
  @IsOptional() @IsDateString() registeredAt?: string;

  @IsOptional() @IsString() @MaxLength(150) qualification?: string;
  @IsOptional() @IsString() @MaxLength(150) fieldOfStudy?: string;
  @IsOptional() @IsString() @MaxLength(255) institution?: string;
  @IsOptional() @IsString() languages?: string;

  @IsOptional() @IsString() @MaxLength(150) department?: string;
  @IsOptional() @IsString() @MaxLength(150) category?: string;
  @IsOptional() @IsString() @MaxLength(80) jobGrade?: string;
  @IsOptional() @IsString() @MaxLength(80) transportAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) houseAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) mobileAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) foodCoupon?: string;
  @IsOptional() @IsString() @MaxLength(40) maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(150) placeOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(20) bloodGroup?: string;
  @IsOptional() @IsString() @MaxLength(150) motherName?: string;
  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(80) emergencyRelationship?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyPhone?: string;
  @IsOptional() @IsString() @MaxLength(150) guarantorName?: string;
  @IsOptional() @IsString() @MaxLength(30) guarantorPhone?: string;
  @IsOptional() @IsString() @MaxLength(40) guarantorNationalId?: string;
  @IsOptional() @IsString() @MaxLength(80) bankAccount?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateOfficeCandidateDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @IsString() @Length(9, 30) phone?: string;
  @IsOptional()
  @ValidateIf((_, v) => typeof v === 'string' && v.length > 0)
  @Matches(/^\d{16}$/, { message: 'National ID FAN number must be exactly 16 digits' })
  nationalId?: string;
  @IsOptional() @IsString() @MaxLength(200) headline?: string;
  @IsOptional() @IsString() @MaxLength(30) gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @Type(() => Number) @IsNumber() expectedSalary?: number;
  @IsOptional() @IsBoolean() consent?: boolean;
  @IsOptional() @IsIn(OFFICE_STATUSES) officeStatus?: OfficeStatus;
  @IsOptional() @IsDateString() registeredAt?: string;
  @IsOptional() @IsString() @MaxLength(150) qualification?: string;
  @IsOptional() @IsString() @MaxLength(150) fieldOfStudy?: string;
  @IsOptional() @IsString() @MaxLength(255) institution?: string;
  @IsOptional() @IsString() languages?: string;
  @IsOptional() @IsString() @MaxLength(150) department?: string;
  @IsOptional() @IsString() @MaxLength(150) category?: string;
  @IsOptional() @IsString() @MaxLength(80) jobGrade?: string;
  @IsOptional() @IsString() @MaxLength(80) transportAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) houseAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) mobileAllowance?: string;
  @IsOptional() @IsString() @MaxLength(80) foodCoupon?: string;
  @IsOptional() @IsString() @MaxLength(40) maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(150) placeOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(20) bloodGroup?: string;
  @IsOptional() @IsString() @MaxLength(150) motherName?: string;
  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(80) emergencyRelationship?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyPhone?: string;
  @IsOptional() @IsString() @MaxLength(150) guarantorName?: string;
  @IsOptional() @IsString() @MaxLength(30) guarantorPhone?: string;
  @IsOptional() @IsString() @MaxLength(40) guarantorNationalId?: string;
  @IsOptional() @IsString() @MaxLength(80) bankAccount?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateOfficeStatusDto {
  @IsIn(OFFICE_STATUSES)
  officeStatus!: OfficeStatus;
}
