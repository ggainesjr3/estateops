import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorInvoiceStatus } from '@estateops/shared';

export class VendorInvoiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ticketId!: string;

  @ApiProperty({ format: 'uuid' })
  vendorId!: string;

  @ApiPropertyOptional()
  vendorName!: string | null;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: VendorInvoiceStatus })
  status!: VendorInvoiceStatus;

  @ApiProperty({ format: 'date' })
  dueDate!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  approvedBy!: string | null;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
