import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantsSchema1737661000000 implements MigrationInterface {
  name = 'TenantsSchema1737661000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tenant_record_status" AS ENUM ('prospect', 'active', 'past', 'blacklisted')
    `);
    await queryRunner.query(`
      CREATE TYPE "govt_id_type" AS ENUM ('drivers_license', 'passport', 'state_id', 'other')
    `);
    await queryRunner.query(`
      CREATE TYPE "communication_channel" AS ENUM ('email', 'sms', 'phone', 'in_person', 'portal')
    `);
    await queryRunner.query(`
      CREATE TYPE "communication_direction" AS ENUM ('inbound', 'outbound')
    `);
    await queryRunner.query(`
      CREATE TYPE "lease_status" AS ENUM ('draft', 'active', 'expired', 'terminated')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "email" character varying(320) NOT NULL,
        "phone" character varying(30),
        "dob" date,
        "govt_id_type" "govt_id_type",
        "govt_id_last4" character varying(4),
        "status" "tenant_record_status" NOT NULL DEFAULT 'prospect',
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenants_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenants_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_org_id" ON "tenants" ("org_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_tenants_org_email"
        ON "tenants" ("org_id", "email")
        WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_user_id" ON "tenants" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_emergency_contacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "relationship" character varying(100) NOT NULL,
        "phone" character varying(30) NOT NULL,
        "email" character varying(320),
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_emergency_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_emergency_contacts_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_emergency_contacts_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_emergency_contacts_org_id"
        ON "tenant_emergency_contacts" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_emergency_contacts_tenant_id"
        ON "tenant_emergency_contacts" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_communication_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "channel" "communication_channel" NOT NULL,
        "direction" "communication_direction" NOT NULL,
        "subject" character varying(500),
        "body" text NOT NULL,
        "sent_by_user_id" uuid,
        "sent_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_communication_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_communication_history_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_communication_history_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_communication_history_sent_by" FOREIGN KEY ("sent_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_communication_history_org_id"
        ON "tenant_communication_history" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_communication_history_tenant_id"
        ON "tenant_communication_history" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "leases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "unit_id" uuid NOT NULL,
        "status" "lease_status" NOT NULL DEFAULT 'draft',
        "start_date" date NOT NULL,
        "end_date" date,
        "monthly_rent" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_leases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leases_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leases_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leases_property_id" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_leases_unit_id" FOREIGN KEY ("unit_id")
          REFERENCES "units"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leases_org_id" ON "leases" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leases_tenant_id" ON "leases" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leases_property_id" ON "leases" ("property_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leases_unit_id" ON "leases" ("unit_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "lease_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" "payment_status" NOT NULL DEFAULT 'pending',
        "description" character varying(255),
        "paid_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_payments_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_payments_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_payments_lease_id" FOREIGN KEY ("lease_id")
          REFERENCES "leases"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_payments_org_id" ON "tenant_payments" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tenant_payments_tenant_id" ON "tenant_payments" ("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_communication_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_emergency_contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lease_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "communication_direction"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "communication_channel"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "govt_id_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_record_status"`);
  }
}
