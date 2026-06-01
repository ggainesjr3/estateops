import { BadRequestException } from '@nestjs/common';
import { DocumentEntityType } from '@estateops/shared';
import {
  orgMeetingsPath,
  propertyFinancialsPath,
  propertyLeasesPath,
  propertyMaintenancePath,
  tenantFolderPath,
} from '../../storage/constants/folder-paths';

export interface DocumentFolderContext {
  propertyId?: string;
  tenantId?: string;
}

export function resolveDocumentFolderPath(
  orgId: string,
  entityType: DocumentEntityType,
  context: DocumentFolderContext,
): string {
  switch (entityType) {
    case DocumentEntityType.LEASE:
      if (!context.propertyId) {
        throw new BadRequestException('propertyId is required for lease documents');
      }
      return propertyLeasesPath(orgId, context.propertyId);
    case DocumentEntityType.MAINTENANCE_TICKET:
      if (!context.propertyId) {
        throw new BadRequestException('propertyId is required for maintenance_ticket documents');
      }
      return propertyMaintenancePath(orgId, context.propertyId);
    case DocumentEntityType.FINANCIAL:
      if (!context.propertyId) {
        throw new BadRequestException('propertyId is required for financial documents');
      }
      return propertyFinancialsPath(orgId, context.propertyId);
    case DocumentEntityType.MEETING:
      return orgMeetingsPath(orgId);
    case DocumentEntityType.TENANT:
      if (!context.tenantId) {
        throw new BadRequestException('tenantId is required for tenant documents');
      }
      return tenantFolderPath(orgId, context.tenantId);
    default:
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
  }
}
