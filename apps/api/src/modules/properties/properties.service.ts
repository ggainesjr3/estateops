import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PropertyStatus } from '@estateops/shared';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { TenantContext } from '../../tenant/tenant.context';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';
import {
  PropertyDetailResponseDto,
  PropertyResponseDto,
  PropertySummaryDto,
} from './dto/property-response.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import {
  toPropertyDetailResponseDto,
  toPropertyResponseDto,
} from './mappers/property.mapper';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { StorageService } from '../storage/storage.service';
import { PropertyRepository } from './repositories/property.repository';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly storageService: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreatePropertyDto): Promise<PropertyResponseDto> {
    const property = await this.propertyRepository.create({
      name: dto.name,
      type: dto.type,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 ?? null,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country ?? 'US',
      latitude: dto.latitude?.toString() ?? null,
      longitude: dto.longitude?.toString() ?? null,
      status: dto.status ?? PropertyStatus.ACTIVE,
      createdBy: TenantContext.getUserId(),
    });

    try {
      await this.storageService.createPropertyFolders(property.orgId, property.id);
      await this.auditLog.log({
        action: 'storage.property_folders_provisioned',
        entityType: 'property',
        entityId: property.id,
        newValue: { orgId: property.orgId, propertyId: property.id },
      });
    } catch (err) {
      this.logger.warn(
        `Storage folder creation failed (non-fatal): ${err instanceof Error ? err.message : err}`,
      );
    }

    return toPropertyResponseDto(property);
  }

  async list(query: ListPropertiesQueryDto): Promise<CursorPageDto<PropertyResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.propertyRepository.findPage(
      { type: query.type, status: query.status, city: query.city },
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toPropertyResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async findOne(id: string): Promise<PropertyDetailResponseDto> {
    const result = await this.propertyRepository.findByIdWithSummary(id);
    if (!result) {
      throw new NotFoundException('Property not found');
    }
    const summary: PropertySummaryDto = {
      buildingsCount: result.buildingsCount,
      unitsCount: result.unitsCount,
      vacantUnits: result.vacantUnits,
    };
    return toPropertyDetailResponseDto(result.property, summary);
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<PropertyResponseDto> {
    const property = await this.propertyRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude?.toString() ?? null }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude?.toString() ?? null }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return toPropertyResponseDto(property);
  }

  async remove(id: string): Promise<void> {
    await this.propertyRepository.softDelete(id);
  }
}
