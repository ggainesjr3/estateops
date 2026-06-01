import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  CreateUploadUrlDto,
  DocumentResponseDto,
  DownloadUrlResponseDto,
  RegisterDocumentDto,
  UploadUrlResponseDto,
} from './dto/document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Get a pre-signed upload URL for direct browser upload' })
  @ApiCreatedResponse({ type: UploadUrlResponseDto })
  createUploadUrl(@Body() dto: CreateUploadUrlDto): Promise<UploadUrlResponseDto> {
    return this.documentsService.createUploadUrl(dto);
  }

  @Post()
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Register uploaded file metadata (no binary stored in DB)' })
  @ApiCreatedResponse({ type: DocumentResponseDto })
  register(@Body() dto: RegisterDocumentDto): Promise<DocumentResponseDto> {
    return this.documentsService.register(dto);
  }

  @Get(':id/download')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.MAINTENANCE_STAFF,
    MembershipRole.READ_ONLY,
    MembershipRole.TENANT,
  )
  @ApiOperation({ summary: 'Get a time-limited signed download URL' })
  @ApiOkResponse({ type: DownloadUrlResponseDto })
  download(@Param('id', ParseUUIDPipe) id: string): Promise<DownloadUrlResponseDto> {
    return this.documentsService.getDownloadUrl(id);
  }

  @Delete(':id')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete document metadata' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}
