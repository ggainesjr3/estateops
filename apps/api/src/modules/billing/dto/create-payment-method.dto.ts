import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Stripe payment method id (pm_...)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  stripePaymentMethodId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
