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
import { CreatePropertyDto } from './dto/create-property.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';
import {
  PropertyDetailResponseDto,
  PropertyResponseDto,
} from './dto/property-response.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
@UseGuards(RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a property' })
  @ApiCreatedResponse({ type: PropertyResponseDto })
  create(@Body() dto: CreatePropertyDto): Promise<PropertyResponseDto> {
    return this.propertiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List properties with cursor pagination' })
  @ApiOkResponse({ type: CursorPageDto })
  list(@Query() query: ListPropertiesQueryDto): Promise<CursorPageDto<PropertyResponseDto>> {
    return this.propertiesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property with buildings and units summary' })
  @ApiOkResponse({ type: PropertyDetailResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PropertyDetailResponseDto> {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a property' })
  @ApiOkResponse({ type: PropertyResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a property' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.propertiesService.remove(id);
  }
}
