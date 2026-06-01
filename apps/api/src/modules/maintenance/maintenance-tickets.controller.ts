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
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketAttachmentDto } from './dto/create-ticket-attachment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import {
  TicketAttachmentResponseDto,
  TicketDetailResponseDto,
  TicketResponseDto,
} from './dto/ticket-response.dto';
import { TransitionTicketStatusDto } from './dto/transition-ticket-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { VendorInvoiceResponseDto } from './dto/vendor-invoice-response.dto';
import { MaintenanceTicketsService } from './maintenance-tickets.service';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance/tickets')
@UseGuards(RolesGuard)
export class MaintenanceTicketsController {
  constructor(private readonly ticketsService: MaintenanceTicketsService) {}

  @Post()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Create a maintenance ticket' })
  @ApiCreatedResponse({ type: TicketResponseDto })
  create(@Body() dto: CreateTicketDto): Promise<TicketResponseDto> {
    return this.ticketsService.create(dto);
  }

  @Get()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List maintenance tickets' })
  @ApiOkResponse({ type: CursorPageDto })
  list(@Query() query: ListTicketsQueryDto): Promise<CursorPageDto<TicketResponseDto>> {
    return this.ticketsService.list(query);
  }

  @Get(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Get maintenance ticket detail' })
  @ApiOkResponse({ type: TicketDetailResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TicketDetailResponseDto> {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
  )
  @ApiOperation({ summary: 'Update maintenance ticket fields' })
  @ApiOkResponse({ type: TicketResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a maintenance ticket' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ticketsService.remove(id);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
  )
  @ApiOperation({ summary: 'Transition ticket status (state machine enforced)' })
  @ApiOkResponse({ type: TicketResponseDto })
  transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketStatusDto,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.transitionStatus(id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
  )
  @ApiOperation({ summary: 'Assign vendor and/or staff to a ticket' })
  @ApiOkResponse({ type: TicketResponseDto })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.assign(id, dto);
  }

  @Get(':id/attachments')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List ticket attachments' })
  @ApiOkResponse({ type: [TicketAttachmentResponseDto] })
  listAttachments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketAttachmentResponseDto[]> {
    return this.ticketsService.listAttachments(id);
  }

  @Post(':id/attachments')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Add attachment metadata to a ticket' })
  @ApiCreatedResponse({ type: TicketAttachmentResponseDto })
  addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketAttachmentDto,
  ): Promise<TicketAttachmentResponseDto> {
    return this.ticketsService.addAttachment(id, dto);
  }

  @Get(':id/vendor-invoices')
  @ApiOperation({ summary: 'List vendor invoices for a ticket' })
  @ApiOkResponse({ type: [VendorInvoiceResponseDto] })
  listVendorInvoices(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorInvoiceResponseDto[]> {
    return this.ticketsService.listVendorInvoices(id);
  }

  @Post(':id/vendor-invoices/:invoiceId/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER, MembershipRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Approve a vendor invoice' })
  @ApiOkResponse({ type: VendorInvoiceResponseDto })
  approveVendorInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
  ): Promise<VendorInvoiceResponseDto> {
    return this.ticketsService.approveVendorInvoice(id, invoiceId);
  }

  @Post(':id/vendor-invoices/:invoiceId/pay')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER, MembershipRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark vendor invoice as paid' })
  @ApiOkResponse({ type: VendorInvoiceResponseDto })
  payVendorInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
  ): Promise<VendorInvoiceResponseDto> {
    return this.ticketsService.payVendorInvoice(id, invoiceId);
  }
}
