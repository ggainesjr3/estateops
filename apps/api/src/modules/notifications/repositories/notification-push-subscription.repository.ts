import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { NotificationPushSubscription } from '../entities/notification-push-subscription.entity';

@Injectable()
export class NotificationPushSubscriptionRepository extends TenantAwareRepository<NotificationPushSubscription> {
  constructor(
    @InjectRepository(NotificationPushSubscription)
    repository: Repository<NotificationPushSubscription>,
  ) {
    super(repository);
  }

  async findActiveForUser(userId: string): Promise<NotificationPushSubscription[]> {
    return this.repository.find({
      where: {
        orgId: this.getOrgId(),
        userId,
        isActive: true,
      },
    });
  }
}
