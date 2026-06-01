import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationDirection,
} from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { CommunicationHistoryRepository } from '../repositories/communication-history.repository';
import { TenantRepository } from '../repositories/tenant.repository';

export interface QueueMessageInput {
  tenantId: string;
  channel: CommunicationChannel.EMAIL | CommunicationChannel.SMS;
  subject?: string;
  body: string;
}

@Injectable()
export class CommunicationQueueService {
  private readonly logger = new Logger(CommunicationQueueService.name);

  constructor(
    private readonly communicationRepository: CommunicationHistoryRepository,
    private readonly tenantRepository: TenantRepository,
  ) {}

  async queueOutboundMessage(input: QueueMessageInput): Promise<{ communicationId: string }> {
    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    this.logger.log(
      `Queueing ${input.channel} to tenant ${input.tenantId} (${tenant.email})`,
    );

    const record = await this.communicationRepository.create({
      tenantId: input.tenantId,
      channel: input.channel,
      direction: CommunicationDirection.OUTBOUND,
      subject: input.subject ?? null,
      body: input.body,
      sentByUserId: TenantContext.getUserId(),
      sentAt: new Date(),
    });

    return { communicationId: record.id };
  }
}
