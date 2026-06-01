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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CursorPaginationQueryDto, MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import {
  CommunicationHistoryResponseDto,
  SendMessageResponseDto,
} from './dto/communication-history-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  EmergencyContactResponseDto,
  TenantDetailResponseDto,
  TenantResponseDto,
} from './dto/tenant-response.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a tenant' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List tenants with filters and cursor pagination' })
  @ApiOkResponse({ type: CursorPageDto })
  list(@Query() query: ListTenantsQueryDto): Promise<CursorPageDto<TenantResponseDto>> {
    return this.tenantsService.list(query);
  }

  @Get(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Get tenant profile with emergency contacts and active lease' })
  @ApiOkResponse({ type: TenantDetailResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantDetailResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete tenant (blocked if active lease exists)' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }

  @Post(':id/emergency-contacts')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Add emergency contact' })
  @ApiCreatedResponse({ type: EmergencyContactResponseDto })
  addEmergencyContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContactResponseDto> {
    return this.tenantsService.addEmergencyContact(id, dto);
  }

  @Get(':id/communication-history')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Paginated communication history' })
  @ApiOkResponse({ type: CursorPageDto })
  communicationHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CursorPaginationQueryDto,
  ): Promise<CursorPageDto<CommunicationHistoryResponseDto>> {
    return this.tenantsService.getCommunicationHistory(id, query);
  }

  @Post(':id/send-message')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Queue outbound email or SMS (logged to communication history)' })
  @ApiCreatedResponse({ type: SendMessageResponseDto })
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    return this.tenantsService.sendMessage(id, dto);
  }

  @Get(':id/documents')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List documents linked to a tenant' })
  @ApiOkResponse({ type: [Object] })
  documents(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getDocuments(id);
  }
}
