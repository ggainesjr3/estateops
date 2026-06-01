import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationPlan } from '@estateops/shared';
import { Repository } from 'typeorm';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { StorageService } from '../storage/storage.service';
import { Organization } from './entities/organization.entity';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  plan?: Organization['plan'];
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    private readonly storageService: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const org = await this.organizations.save(
      this.organizations.create({
        name: input.name,
        slug: input.slug,
        plan: input.plan ?? OrganizationPlan.STARTER,
        isActive: true,
      }),
    );

    await this.auditLog.log({
      orgId: org.id,
      userId: null,
      action: 'organization.created',
      entityType: 'organization',
      entityId: org.id,
      newValue: { name: org.name, slug: org.slug },
    });

    try {
      await this.storageService.createOrgFolderStructure(org.id);

      await this.auditLog.log({
        orgId: org.id,
        userId: null,
        action: 'storage.org_folders_provisioned',
        entityType: 'organization',
        entityId: org.id,
        newValue: { orgId: org.id },
      });
    } catch (err) {
      this.logger.warn(
        `Storage folder creation failed (non-fatal): ${err instanceof Error ? err.message : err}`,
      );
    }

    return org;
  }
}
