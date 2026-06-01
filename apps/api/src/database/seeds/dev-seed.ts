import 'reflect-metadata';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
  PropertyStatus,
  PropertyType,
  TenantRecordStatus,
  UnitStatus,
  UnitType,
} from '@estateops/shared';
import dataSource from '../data-source';
import { Property } from '../../modules/properties/entities/property.entity';
import { Unit } from '../../modules/properties/entities/unit.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { MaintenanceTicket } from '../../modules/maintenance/entities/maintenance-ticket.entity';

/**
 * Development seed script.
 *
 * Inserts a small set of realistic, deterministic test data for the existing
 * org/user below. Every row uses a fixed UUID and is inserted with
 * `ON CONFLICT DO NOTHING`, so running this script repeatedly is safe and will
 * not create duplicates.
 *
 * Run with: pnpm --filter api run seed
 */

const ORG_ID = '472d56f3-9d74-4fb1-91df-0bfbb42fa12f';
const USER_ID = '3ca76088-2b88-4695-acd5-49716bad2825';

// Deterministic IDs keep the seed idempotent across runs.
const PROPERTY_IDS = {
  sunset: 'a0000000-0000-4000-8000-000000000001',
  harbor: 'a0000000-0000-4000-8000-000000000002',
  greenfield: 'a0000000-0000-4000-8000-000000000003',
};

const UNIT_IDS = {
  sunset101: 'b0000000-0000-4000-8000-000000000001',
  sunset102: 'b0000000-0000-4000-8000-000000000002',
  harborA: 'b0000000-0000-4000-8000-000000000003',
  harborB: 'b0000000-0000-4000-8000-000000000004',
  greenfield1: 'b0000000-0000-4000-8000-000000000005',
  greenfield2: 'b0000000-0000-4000-8000-000000000006',
};

const TENANT_IDS = {
  john: 'c0000000-0000-4000-8000-000000000001',
  sarah: 'c0000000-0000-4000-8000-000000000002',
  mike: 'c0000000-0000-4000-8000-000000000003',
};

const TICKET_IDS = {
  faucet: 'd0000000-0000-4000-8000-000000000001',
  hvac: 'd0000000-0000-4000-8000-000000000002',
  windowLock: 'd0000000-0000-4000-8000-000000000003',
};

async function seed(): Promise<void> {
  await dataSource.initialize();
  console.log('[dev-seed] Connected to database. Seeding dev data…');

  try {
    // --- Properties (3) ---
    const propertyResult = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Property)
      .values([
        {
          id: PROPERTY_IDS.sunset,
          orgId: ORG_ID,
          name: 'Sunset Apartments',
          type: PropertyType.RESIDENTIAL,
          addressLine1: '123 Oak Ave',
          city: 'Wilmington',
          state: 'DE',
          postalCode: '19801',
          country: 'US',
          status: PropertyStatus.ACTIVE,
          createdBy: USER_ID,
        },
        {
          id: PROPERTY_IDS.harbor,
          orgId: ORG_ID,
          name: 'Harbor View Commercial',
          type: PropertyType.COMMERCIAL,
          addressLine1: '456 Harbor Blvd',
          city: 'Newark',
          state: 'DE',
          postalCode: '19711',
          country: 'US',
          status: PropertyStatus.ACTIVE,
          createdBy: USER_ID,
        },
        {
          id: PROPERTY_IDS.greenfield,
          orgId: ORG_ID,
          name: 'Greenfield Townhomes',
          type: PropertyType.RESIDENTIAL,
          addressLine1: '789 Green St',
          city: 'Dover',
          state: 'DE',
          postalCode: '19901',
          country: 'US',
          status: PropertyStatus.ACTIVE,
          createdBy: USER_ID,
        },
      ])
      .orIgnore()
      .execute();
    console.log(
      `[dev-seed] Properties: ${propertyResult.identifiers.filter(Boolean).length} inserted (existing rows skipped).`,
    );

    // --- Units (6, two per property) ---
    const unitResult = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Unit)
      .values([
        {
          id: UNIT_IDS.sunset101,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.sunset,
          unitNumber: '101',
          type: UnitType.ONE_BR,
          bedrooms: 1,
          status: UnitStatus.OCCUPIED,
          monthlyRent: '1200.00',
        },
        {
          id: UNIT_IDS.sunset102,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.sunset,
          unitNumber: '102',
          type: UnitType.TWO_BR,
          bedrooms: 2,
          status: UnitStatus.VACANT,
          monthlyRent: '1500.00',
        },
        {
          id: UNIT_IDS.harborA,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.harbor,
          unitNumber: 'A',
          type: UnitType.COMMERCIAL,
          status: UnitStatus.OCCUPIED,
          monthlyRent: '3000.00',
        },
        {
          id: UNIT_IDS.harborB,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.harbor,
          unitNumber: 'B',
          type: UnitType.COMMERCIAL,
          status: UnitStatus.VACANT,
          monthlyRent: '2500.00',
        },
        {
          id: UNIT_IDS.greenfield1,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.greenfield,
          unitNumber: '1',
          type: UnitType.THREE_BR,
          bedrooms: 3,
          status: UnitStatus.OCCUPIED,
          monthlyRent: '1800.00',
        },
        {
          id: UNIT_IDS.greenfield2,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.greenfield,
          unitNumber: '2',
          type: UnitType.TWO_BR,
          bedrooms: 2,
          status: UnitStatus.MAINTENANCE,
          monthlyRent: '1600.00',
        },
      ])
      .orIgnore()
      .execute();
    console.log(
      `[dev-seed] Units: ${unitResult.identifiers.filter(Boolean).length} inserted (existing rows skipped).`,
    );

    // --- Tenants (3) ---
    const tenantResult = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Tenant)
      .values([
        {
          id: TENANT_IDS.john,
          orgId: ORG_ID,
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          status: TenantRecordStatus.ACTIVE,
        },
        {
          id: TENANT_IDS.sarah,
          orgId: ORG_ID,
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.j@email.com',
          status: TenantRecordStatus.ACTIVE,
        },
        {
          id: TENANT_IDS.mike,
          orgId: ORG_ID,
          firstName: 'Mike',
          lastName: 'Davis',
          email: 'mike.d@email.com',
          status: TenantRecordStatus.ACTIVE,
        },
      ])
      .orIgnore()
      .execute();
    console.log(
      `[dev-seed] Tenants: ${tenantResult.identifiers.filter(Boolean).length} inserted (existing rows skipped).`,
    );

    // --- Maintenance tickets (3) ---
    const ticketResult = await dataSource
      .createQueryBuilder()
      .insert()
      .into(MaintenanceTicket)
      .values([
        {
          id: TICKET_IDS.faucet,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.sunset,
          unitId: UNIT_IDS.sunset101,
          title: 'Leaking faucet in kitchen',
          trade: MaintenanceTrade.PLUMBING,
          priority: MaintenanceTicketPriority.HIGH,
          status: MaintenanceTicketStatus.CREATED,
          createdBy: USER_ID,
        },
        {
          id: TICKET_IDS.hvac,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.greenfield,
          unitId: UNIT_IDS.greenfield1,
          title: 'HVAC not cooling',
          trade: MaintenanceTrade.HVAC,
          priority: MaintenanceTicketPriority.CRITICAL,
          status: MaintenanceTicketStatus.TRIAGED,
          createdBy: USER_ID,
        },
        {
          id: TICKET_IDS.windowLock,
          orgId: ORG_ID,
          propertyId: PROPERTY_IDS.harbor,
          unitId: UNIT_IDS.harborA,
          title: 'Broken window lock',
          trade: MaintenanceTrade.STRUCTURAL,
          priority: MaintenanceTicketPriority.MEDIUM,
          status: MaintenanceTicketStatus.ASSIGNED,
          createdBy: USER_ID,
        },
      ])
      .orIgnore()
      .execute();
    console.log(
      `[dev-seed] Maintenance tickets: ${ticketResult.identifiers.filter(Boolean).length} inserted (existing rows skipped).`,
    );

    console.log('[dev-seed] Done.');
  } finally {
    await dataSource.destroy();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[dev-seed] Failed:', err);
    process.exit(1);
  });
