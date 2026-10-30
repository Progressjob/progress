import { IsEmail, IsOptional, IsString, IsUUID, Length, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsString()
  @Length(9, 30, { message: 'Phone number is required and must be at least 9 characters' })
  phone!: string;
}

export class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;
}

export class GoogleLoginDto {
  @IsString()
  idToken!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class EnableEmployerDto {
  @IsString()
  @Length(2, 255)
  name!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  @Length(9, 30, { message: 'Phone number is required and must be at least 9 characters' })
  phone!: string;

  @IsOptional()
  @ValidateIf((_, value) => Boolean(typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  logoFileId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  companySize?: string;
}
