import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../tenant/tenant.context';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  orgId?: string;
  userId?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const orgId = entry.orgId ?? TenantContext.getOrgId();
    let userId: string | null = entry.userId ?? null;
    if (userId === undefined) {
      try {
        userId = TenantContext.getUserId();
      } catch {
        userId = null;
      }
    }

    await this.repository.save(
      this.repository.create({
        orgId,
        userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        ipAddress: null,
      }),
    );
  }
}
