import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentOrg } from '../../tenant/decorators/current-org.decorator';
import {
  LinkPropertyDto,
  ListMeetingsQueryDto,
  MeetingDetailDto,
  MeetingListResponseDto,
  RecordingUrlResponseDto,
} from './dto/meeting.dto';
import { ZoomService } from './zoom.service';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
@UseGuards(RolesGuard)
export class MeetingsController {
  constructor(private readonly zoom: ZoomService) {}

  @Get()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'List archived Zoom meetings' })
  @ApiOkResponse({ type: MeetingListResponseDto })
  list(
    @CurrentOrg() orgId: string,
    @Query() query: ListMeetingsQueryDto,
  ): Promise<MeetingListResponseDto> {
    return this.zoom.searchMeetings(orgId, {
      query: query.q,
      propertyId: query.propertyId,
      status: query.status,
      hostUserId: query.hostUserId,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.ACCOUNTANT,
    MembershipRole.READ_ONLY,
  )
  @ApiOkResponse({ type: MeetingDetailDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MeetingDetailDto> {
    return this.zoom.getMeeting(id);
  }

  @Patch(':id/link-property')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @ApiOkResponse({ type: MeetingDetailDto })
  linkProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkPropertyDto,
  ): Promise<MeetingDetailDto> {
    return this.zoom.linkMeetingToProperty(id, dto.propertyId);
  }

  @Get(':id/recording-url')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.MAINTENANCE_STAFF,
  )
  @ApiOkResponse({ type: RecordingUrlResponseDto })
  recordingUrl(@Param('id', ParseUUIDPipe) id: string): Promise<RecordingUrlResponseDto> {
    return this.zoom.getRecordingDownloadUrl(id);
  }
}
