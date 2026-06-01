import {
  Body,
  Controller,
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
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ListLeasesQueryDto } from './dto/list-leases-query.dto';
import {
  LeaseDetailResponseDto,
  LeaseResponseDto,
  LeaseVersionResponseDto,
} from './dto/lease-response.dto';
import { SignLeaseDto } from './dto/sign-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeasesService } from './leases.service';

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
@UseGuards(RolesGuard)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a lease in draft status' })
  @ApiCreatedResponse({ type: LeaseResponseDto })
  create(@Body() dto: CreateLeaseDto): Promise<LeaseResponseDto> {
    return this.leasesService.create(dto);
  }

  @Get()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List leases with filters' })
  @ApiOkResponse({ type: [LeaseResponseDto] })
  list(@Query() query: ListLeasesQueryDto) {
    return this.leasesService.list(query);
  }

  @Get(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Get lease detail with tenants and payment history' })
  @ApiOkResponse({ type: LeaseDetailResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseDetailResponseDto> {
    return this.leasesService.findOne(id);
  }

  @Patch(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a draft lease' })
  @ApiOkResponse({ type: LeaseResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.update(id, dto);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Send lease for signing (draft → pending)' })
  @ApiOkResponse({ type: LeaseResponseDto })
  send(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseResponseDto> {
    return this.leasesService.send(id);
  }

  @Post(':id/recall')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Recall lease from pending (pending → draft)' })
  @ApiOkResponse({ type: LeaseResponseDto })
  recall(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseResponseDto> {
    return this.leasesService.recall(id);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Record tenant or manager signature' })
  @ApiOkResponse({ type: LeaseResponseDto })
  sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.sign(id, dto);
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Renew an active lease (creates new draft lease)' })
  @ApiOkResponse({ type: LeaseResponseDto })
  renew(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseResponseDto> {
    return this.leasesService.renew(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Terminate an active lease' })
  @ApiOkResponse({ type: LeaseResponseDto })
  terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.terminate(id, dto);
  }

  @Get(':id/versions')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List immutable lease version snapshots' })
  @ApiOkResponse({ type: [LeaseVersionResponseDto] })
  versions(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseVersionResponseDto[]> {
    return this.leasesService.listVersions(id);
  }
}
