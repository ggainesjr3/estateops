import { Injectable, NotFoundException } from '@nestjs/common';
import { UnitStatus } from '@estateops/shared';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { toUnitResponseDto } from './mappers/property.mapper';
import { UnitRepository } from './repositories/unit.repository';

@Injectable()
export class UnitsService {
  constructor(private readonly unitRepository: UnitRepository) {}

  async create(propertyId: string, dto: CreateUnitDto): Promise<UnitResponseDto> {
    await this.unitRepository.assertPropertyInOrg(propertyId);
    const unit = await this.unitRepository.create({
      propertyId,
      buildingId: dto.buildingId ?? null,
      floorNumber: dto.floorNumber ?? null,
      unitNumber: dto.unitNumber,
      type: dto.type,
      sqft: dto.sqft?.toString() ?? null,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms?.toString() ?? null,
      status: dto.status ?? UnitStatus.VACANT,
      monthlyRent: dto.monthlyRent?.toString() ?? null,
    });
    return toUnitResponseDto(unit);
  }

  async list(
    propertyId: string,
    query: ListUnitsQueryDto,
  ): Promise<CursorPageDto<UnitResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.unitRepository.findPageByProperty(
      propertyId,
      {
        type: query.type,
        status: query.status,
        buildingId: query.buildingId,
      },
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toUnitResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async findOne(propertyId: string, id: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findByIdForProperty(propertyId, id);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return toUnitResponseDto(unit);
  }

  async update(
    propertyId: string,
    id: string,
    dto: UpdateUnitDto,
  ): Promise<UnitResponseDto> {
    const existing = await this.unitRepository.findByIdForProperty(propertyId, id);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }
    const unit = await this.unitRepository.update(id, {
      ...(dto.buildingId !== undefined && { buildingId: dto.buildingId }),
      ...(dto.floorNumber !== undefined && { floorNumber: dto.floorNumber }),
      ...(dto.unitNumber !== undefined && { unitNumber: dto.unitNumber }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.sqft !== undefined && { sqft: dto.sqft?.toString() ?? null }),
      ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
      ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms?.toString() ?? null }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.monthlyRent !== undefined && {
        monthlyRent: dto.monthlyRent?.toString() ?? null,
      }),
      propertyId,
    });
    return toUnitResponseDto(unit);
  }

  async remove(propertyId: string, id: string): Promise<void> {
    const existing = await this.unitRepository.findByIdForProperty(propertyId, id);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }
    await this.unitRepository.softDelete(id);
  }
}
