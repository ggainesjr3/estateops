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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../tenant/decorators/current-user.decorator';
import { NotificationService } from './services/notification.service';
import { NotificationChannel } from '@estateops/shared';
import { NotificationOptOutRepository } from './repositories/notification-opt-out.repository';
import {
  ListNotificationsQueryDto,
  MarkAllReadResponseDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  OptOutChannelDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly optOuts: NotificationOptOutRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ type: NotificationListResponseDto })
  list(
    @CurrentUser() userId: string,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notifications.getForUser(userId, {
      channel: query.channel,
      unreadOnly: query.unreadOnly === true || String(query.unreadOnly) === 'true',
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread in-app notification count' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  unreadCount(@CurrentUser() userId: string): Promise<UnreadCountResponseDto> {
    return this.notifications.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(id, userId);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  markAllRead(@CurrentUser() userId: string): Promise<MarkAllReadResponseDto> {
    return this.notifications.markAllRead(userId);
  }

  @Post('opt-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Opt out of a notification channel' })
  async optOut(
    @CurrentUser() userId: string,
    @Body() dto: OptOutChannelDto,
  ): Promise<{ channel: NotificationChannel }> {
    await this.optOuts.optOut(userId, dto.channel);
    return { channel: dto.channel };
  }

  @Post('opt-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enable a notification channel' })
  async optIn(
    @CurrentUser() userId: string,
    @Body() dto: OptOutChannelDto,
  ): Promise<{ channel: NotificationChannel }> {
    await this.optOuts.optIn(userId, dto.channel);
    return { channel: dto.channel };
  }
}
