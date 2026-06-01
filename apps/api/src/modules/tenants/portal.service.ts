import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../../tenant/tenant.context';
import { PortalMeResponseDto } from './dto/portal-response.dto';
import {
  toPortalLeaseDto,
  toPortalPaymentDto,
  toTenantDetailResponseDto,
} from './mappers/tenant.mapper';
import { EmergencyContactRepository } from './repositories/emergency-contact.repository';
import { LeaseRepository } from '../leases/repositories/lease.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { TenantRepository } from './repositories/tenant.repository';

@Injectable()
export class PortalService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly emergencyContactRepository: EmergencyContactRepository,
    private readonly leaseRepository: LeaseRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async getMe(): Promise<PortalMeResponseDto> {
    const tenant = await this.tenantRepository.findByUserId(TenantContext.getUserId());
    if (!tenant) {
      throw new NotFoundException('Tenant profile not found');
    }

    const emergencyContacts = await this.emergencyContactRepository.findByTenantId(tenant.id);
    const lease = await this.leaseRepository.findActiveByUserId(TenantContext.getUserId());
    const payments = await this.paymentRepository.findByTenantId(tenant.id);

    return {
      profile: toTenantDetailResponseDto(tenant, emergencyContacts, lease),
      lease: lease ? toPortalLeaseDto(lease) : null,
      paymentHistory: payments.map(toPortalPaymentDto),
    };
  }
}
