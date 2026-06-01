import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentInstrument } from '@estateops/shared';
import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  invoiceId!: string;

  @ApiProperty({ description: 'NUMERIC(15,2)' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ enum: PaymentInstrument })
  @IsEnum(PaymentInstrument)
  method!: PaymentInstrument;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;
}
