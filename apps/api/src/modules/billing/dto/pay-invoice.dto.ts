import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PayInvoiceDto {
  @ApiProperty({ description: 'Stripe payment method id (pm_...)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paymentMethodId!: string;
}
