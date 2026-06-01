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
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@ApiTags('units')
@ApiBearerAuth()
@Controller('properties/:propertyId/units')
@UseGuards(RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a unit under a property' })
  @ApiCreatedResponse({ type: UnitResponseDto })
  create(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateUnitDto,
  ): Promise<UnitResponseDto> {
    return this.unitsService.create(propertyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List units for a property' })
  @ApiOkResponse({ type: CursorPageDto })
  list(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() query: ListUnitsQueryDto,
  ): Promise<CursorPageDto<UnitResponseDto>> {
    return this.unitsService.list(propertyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a unit by id' })
  @ApiOkResponse({ type: UnitResponseDto })
  findOne(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UnitResponseDto> {
    return this.unitsService.findOne(propertyId, id);
  }

  @Patch(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a unit' })
  @ApiOkResponse({ type: UnitResponseDto })
  update(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
  ): Promise<UnitResponseDto> {
    return this.unitsService.update(propertyId, id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a unit' })
  remove(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.unitsService.remove(propertyId, id);
  }
}
