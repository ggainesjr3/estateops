import { AsyncLocalStorage } from 'async_hooks';
import { UnauthorizedException } from '@nestjs/common';

export interface TenantStore {
  orgId: string;
  userId: string;
}

const tenantStorage = new AsyncLocalStorage<TenantStore>();

export class TenantContext {
  static run<T>(store: TenantStore, fn: () => T): T {
    return tenantStorage.run(store, fn);
  }

  static getStore(): TenantStore | undefined {
    return tenantStorage.getStore();
  }

  static getOrgId(): string {
    const orgId = tenantStorage.getStore()?.orgId;
    if (!orgId) {
      throw new UnauthorizedException('Organization context is required');
    }
    return orgId;
  }

  static getUserId(): string {
    const userId = tenantStorage.getStore()?.userId;
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    return userId;
  }
}
