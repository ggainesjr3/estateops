import { Property } from '../entities/property.entity';
import {
  PropertyDetailResponseDto,
  PropertyResponseDto,
  PropertySummaryDto,
} from '../dto/property-response.dto';
import { Unit } from '../entities/unit.entity';
import { UnitResponseDto } from '../dto/unit-response.dto';

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'number' ? value : parseFloat(value);
}

export function toPropertyResponseDto(property: Property): PropertyResponseDto {
  return {
    id: property.id,
    orgId: property.orgId,
    name: property.name,
    type: property.type,
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    city: property.city,
    state: property.state,
    postalCode: property.postalCode,
    country: property.country,
    latitude: toNumber(property.latitude),
    longitude: toNumber(property.longitude),
    status: property.status,
    createdBy: property.createdBy,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  };
}

export function toPropertyDetailResponseDto(
  property: Property,
  summary: PropertySummaryDto,
): PropertyDetailResponseDto {
  return {
    ...toPropertyResponseDto(property),
    summary,
  };
}

export function toUnitResponseDto(unit: Unit): UnitResponseDto {
  return {
    id: unit.id,
    orgId: unit.orgId,
    propertyId: unit.propertyId,
    buildingId: unit.buildingId,
    floorNumber: unit.floorNumber,
    unitNumber: unit.unitNumber,
    type: unit.type,
    sqft: toNumber(unit.sqft),
    bedrooms: unit.bedrooms,
    bathrooms: toNumber(unit.bathrooms),
    status: unit.status,
    monthlyRent: toNumber(unit.monthlyRent),
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}
