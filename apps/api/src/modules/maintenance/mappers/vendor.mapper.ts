import { Vendor } from '../entities/vendor.entity';
import { VendorResponseDto } from '../dto/vendor.dto';

export function toVendorResponseDto(vendor: Vendor): VendorResponseDto {
  return {
    id: vendor.id,
    name: vendor.name,
    trades: vendor.trades,
    email: vendor.email,
    phone: vendor.phone,
    licenseNumber: vendor.licenseNumber,
    insuranceExpiry: vendor.insuranceExpiry,
    rating: vendor.rating,
    isActive: vendor.isActive,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}
