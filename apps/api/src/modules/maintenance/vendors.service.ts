import { Injectable, NotFoundException } from '@nestjs/common';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { CreateVendorDto, ListVendorsQueryDto, UpdateVendorDto, VendorResponseDto } from './dto/vendor.dto';
import { toVendorResponseDto } from './mappers/vendor.mapper';
import { MaintenanceTicketRepository } from './repositories/maintenance-ticket.repository';
import { VendorRepository } from './repositories/vendor.repository';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { toTicketResponseDto } from './mappers/ticket.mapper';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly ticketRepository: MaintenanceTicketRepository,
  ) {}

  async create(dto: CreateVendorDto): Promise<VendorResponseDto> {
    const vendor = await this.vendorRepository.create({
      name: dto.name,
      trades: dto.trades,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      licenseNumber: dto.licenseNumber ?? null,
      insuranceExpiry: dto.insuranceExpiry ?? null,
      rating: dto.rating != null ? String(dto.rating) : null,
      isActive: true,
    });
    return toVendorResponseDto(vendor);
  }

  async list(query: ListVendorsQueryDto): Promise<CursorPageDto<VendorResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.vendorRepository.findPage(
      { trade: query.trade, isActive: query.isActive },
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toVendorResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async findOne(id: string): Promise<VendorResponseDto> {
    const vendor = await this.vendorRepository.findById(id);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    return toVendorResponseDto(vendor);
  }

  async update(id: string, dto: UpdateVendorDto): Promise<VendorResponseDto> {
    const vendor = await this.vendorRepository.update(id, {
      name: dto.name,
      trades: dto.trades,
      email: dto.email,
      phone: dto.phone,
      licenseNumber: dto.licenseNumber,
      insuranceExpiry: dto.insuranceExpiry,
      rating: dto.rating != null ? String(dto.rating) : dto.rating === null ? null : undefined,
      isActive: dto.isActive,
    });
    return toVendorResponseDto(vendor);
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.vendorRepository.findByIdOrFail(id);
    await this.vendorRepository.update(id, { isActive: false });
    void vendor;
  }

  async listVendorTickets(
    vendorId: string,
    query: ListTicketsQueryDto,
  ): Promise<CursorPageDto<TicketResponseDto>> {
    await this.vendorRepository.findByIdOrFail(vendorId);
    const limit = query.limit ?? 20;
    const page = await this.ticketRepository.findByVendorId(vendorId, query.cursor, limit);
    return new CursorPageDto(
      page.items.map(toTicketResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }
}
