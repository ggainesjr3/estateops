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
import {
  CreateNotificationTemplateDto,
  NotificationTemplateResponseDto,
  UpdateNotificationTemplateDto,
} from './dto/notification.dto';
import { NotificationTemplateService } from './services/notification-template.service';

@ApiTags('admin/notification-templates')
@ApiBearerAuth()
@Controller('admin/notification-templates')
@UseGuards(RolesGuard)
export class AdminNotificationTemplatesController {
  constructor(private readonly templates: NotificationTemplateService) {}

  @Get()
  @Roles(
    MembershipRole.SUPER_ADMIN,
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
  )
  @ApiOperation({ summary: 'List notification templates (org + system)' })
  @ApiOkResponse({ type: [NotificationTemplateResponseDto] })
  list(): Promise<NotificationTemplateResponseDto[]> {
    return this.templates.list();
  }

  @Get(':id')
  @Roles(
    MembershipRole.SUPER_ADMIN,
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
  )
  @ApiOkResponse({ type: NotificationTemplateResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<NotificationTemplateResponseDto> {
    return this.templates.get(id);
  }

  @Post()
  @Roles(MembershipRole.SUPER_ADMIN, MembershipRole.ORG_ADMIN)
  @ApiCreatedResponse({ type: NotificationTemplateResponseDto })
  create(
    @Body() dto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    return this.templates.create(dto);
  }

  @Patch(':id')
  @Roles(MembershipRole.SUPER_ADMIN, MembershipRole.ORG_ADMIN)
  @ApiOkResponse({ type: NotificationTemplateResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @Roles(MembershipRole.SUPER_ADMIN, MembershipRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.templates.remove(id);
  }
}
