import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { NotificationOptOut } from '../entities/notification-opt-out.entity';

@Injectable()
export class NotificationOptOutRepository extends TenantAwareRepository<NotificationOptOut> {
  constructor(
    @InjectRepository(NotificationOptOut)
    repository: Repository<NotificationOptOut>,
  ) {
    super(repository);
  }

  async isOptedOut(userId: string, channel: NotificationChannel): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        orgId: this.getOrgId(),
        userId,
        channel,
      },
    });
    return count > 0;
  }

  async optOut(userId: string, channel: NotificationChannel): Promise<NotificationOptOut> {
    const existing = await this.repository.findOne({
      where: { orgId: this.getOrgId(), userId, channel },
    });
    if (existing) return existing;
    return this.create({ userId, channel } as NotificationOptOut);
  }

  async optIn(userId: string, channel: NotificationChannel): Promise<void> {
    await this.repository.delete({
      orgId: this.getOrgId(),
      userId,
      channel,
    });
  }
}
