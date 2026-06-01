import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { CreateVendorDto, ListVendorsQueryDto, UpdateVendorDto, VendorResponseDto } from './dto/vendor.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { VendorsService } from './vendors.service';

@ApiTags('vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiCreatedResponse({ type: VendorResponseDto })
  create(@Body() dto: CreateVendorDto): Promise<VendorResponseDto> {
    return this.vendorsService.create(dto);
  }

  @Get()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List vendors' })
  @ApiOkResponse({ type: CursorPageDto })
  list(@Query() query: ListVendorsQueryDto): Promise<CursorPageDto<VendorResponseDto>> {
    return this.vendorsService.list(query);
  }

  @Get(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Get vendor by id' })
  @ApiOkResponse({ type: VendorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VendorResponseDto> {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a vendor' })
  @ApiOkResponse({ type: VendorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<VendorResponseDto> {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a vendor' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vendorsService.remove(id);
  }

  @Get(':id/tickets')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List tickets assigned to a vendor' })
  @ApiOkResponse({ type: CursorPageDto })
  listTickets(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListTicketsQueryDto,
  ): Promise<CursorPageDto<TicketResponseDto>> {
    return this.vendorsService.listVendorTickets(id, query);
  }
}
