import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeasesModuleSchema1737662000000 implements MigrationInterface {
  name = 'LeasesModuleSchema1737662000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "lease_status" ADD VALUE IF NOT EXISTS 'pending'`);
    await queryRunner.query(`ALTER TYPE "lease_status" ADD VALUE IF NOT EXISTS 'renewed'`);

    await queryRunner.query(`
      CREATE TYPE "rent_escalation_frequency" AS ENUM ('none', 'annual', 'biannual')
    `);

    await queryRunner.query(`
      CREATE TABLE "lease_tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "lease_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "signed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lease_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lease_tenants_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lease_tenants_lease_id" FOREIGN KEY ("lease_id")
          REFERENCES "leases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lease_tenants_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lease_tenants_org_id" ON "lease_tenants" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lease_tenants_lease_id" ON "lease_tenants" ("lease_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lease_tenants_tenant_id" ON "lease_tenants" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_lease_tenants_lease_tenant"
        ON "lease_tenants" ("lease_id", "tenant_id")
    `);

    await queryRunner.query(`
      INSERT INTO "lease_tenants" ("org_id", "lease_id", "tenant_id", "is_primary")
      SELECT "org_id", "id", "tenant_id", true
      FROM "leases"
      WHERE "tenant_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "lease_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "lease_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "snapshot" jsonb NOT NULL,
        "changed_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lease_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lease_versions_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lease_versions_lease_id" FOREIGN KEY ("lease_id")
          REFERENCES "leases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lease_versions_changed_by" FOREIGN KEY ("changed_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lease_versions_org_id" ON "lease_versions" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_lease_versions_lease_id" ON "lease_versions" ("lease_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_lease_versions_lease_version"
        ON "lease_versions" ("lease_id", "version")
    `);

    await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "FK_leases_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leases_tenant_id"`);
    await queryRunner.query(`ALTER TABLE "leases" DROP COLUMN IF EXISTS "tenant_id"`);

    await queryRunner.query(`ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "security_deposit" numeric(12,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "late_fee_amount" numeric(12,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "late_fee_grace_days" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "rent_escalation_percent" numeric(5,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "leases"
        ADD COLUMN IF NOT EXISTS "rent_escalation_frequency" "rent_escalation_frequency"
        NOT NULL DEFAULT 'none'
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "signed_by_tenant_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "signed_by_manager_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "terminated_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "termination_reason" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "renewed_from_lease_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "created_by" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD CONSTRAINT "FK_leases_renewed_from"
        FOREIGN KEY ("renewed_from_lease_id") REFERENCES "leases"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "leases" ADD CONSTRAINT "FK_leases_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "FK_leases_created_by"`);
    await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "FK_leases_renewed_from"`);
    await queryRunner.query(`ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "tenant_id" uuid`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lease_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lease_tenants"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rent_escalation_frequency"`);
  }
}
