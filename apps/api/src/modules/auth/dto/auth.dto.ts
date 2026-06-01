import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { MembershipRole } from '@estateops/shared';

export class RegisterDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional org to join on first login' })
  @IsOptional()
  @IsUUID()
  orgId?: string;

  @ApiPropertyOptional({ description: 'Optional role for initial org membership' })
  @IsOptional()
  @IsString()
  role?: MembershipRole | string;
}

export class LoginDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}

export class RefreshDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;
}

export class AuthMembershipDto {
  @ApiProperty({ format: 'uuid' })
  orgId!: string;

  @ApiProperty({ enumName: 'membership_role', required: false })
  role!: string;
}

export class AuthSuccessDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthMembershipDto })
  membership!: AuthMembershipDto;

  @ApiProperty({ description: 'Access token (JWT)' })
  accessToken!: string;

  @ApiPropertyOptional({
    description: 'CSRF token to send back on cookie-based requests (x-csrf-token header).',
  })
  csrfToken?: string;
}

