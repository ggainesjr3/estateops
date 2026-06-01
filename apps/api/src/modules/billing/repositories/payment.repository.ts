import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository extends TenantAwareRepository<Payment> {
  constructor(
    @InjectRepository(Payment)
    repository: Repository<Payment>,
  ) {
    super(repository);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null> {
    return this.repository.findOne({
      where: { idempotencyKey, orgId: this.getOrgId() },
      relations: ['invoice'],
    });
  }

  async findByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Payment | null> {
    return this.repository.findOne({
      where: { stripePaymentIntentId },
      relations: ['invoice'],
    });
  }

  async findByStripeChargeId(stripeChargeId: string): Promise<Payment | null> {
    return this.repository.findOne({
      where: { stripeChargeId },
      relations: ['invoice'],
    });
  }
}
