import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDeliveryEvent } from '../entities/notification-delivery-event.entity';

@Injectable()
export class NotificationDeliveryEventRepository {
  constructor(
    @InjectRepository(NotificationDeliveryEvent)
    private readonly repository: Repository<NotificationDeliveryEvent>,
  ) {}

  async create(
    data: Partial<NotificationDeliveryEvent>,
  ): Promise<NotificationDeliveryEvent> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
