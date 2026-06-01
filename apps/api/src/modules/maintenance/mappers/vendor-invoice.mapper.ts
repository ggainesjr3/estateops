import { VendorInvoice } from '../entities/vendor-invoice.entity';
import { VendorInvoiceResponseDto } from '../dto/vendor-invoice-response.dto';

export function toVendorInvoiceResponseDto(invoice: VendorInvoice): VendorInvoiceResponseDto {
  return {
    id: invoice.id,
    ticketId: invoice.ticketId,
    vendorId: invoice.vendorId,
    vendorName: invoice.vendor?.name ?? null,
    amount: invoice.amount,
    status: invoice.status,
    dueDate: invoice.dueDate,
    approvedBy: invoice.approvedBy,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
  };
}
