import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaintenanceModuleSchema1737666000000 implements MigrationInterface {
  name = 'MaintenanceModuleSchema1737666000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "maintenance_ticket_priority" RENAME VALUE 'normal' TO 'medium'
    `);
    await queryRunner.query(`
      ALTER TYPE "maintenance_ticket_priority" RENAME VALUE 'emergency' TO 'critical'
    `);
    await queryRunner.query(`
      ALTER TYPE "maintenance_trade" ADD VALUE IF NOT EXISTS 'cleaning'
    `);
    await queryRunner.query(`
      ALTER TYPE "maintenance_trade" ADD VALUE IF NOT EXISTS 'pest_control'
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_ticket_status" AS ENUM (
        'created', 'triaged', 'assigned', 'dispatched', 'in_progress',
        'completed', 'invoiced', 'closed'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "ticket_attachment_storage_provider" AS ENUM ('sharepoint', 's3')
    `);
    await queryRunner.query(`
      CREATE TYPE "vendor_invoice_status" AS ENUM ('pending', 'approved', 'paid')
    `);

    await queryRunner.query(`
      CREATE TABLE "vendors" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "trades" "maintenance_trade"[] NOT NULL DEFAULT '{}',
        "email" character varying(320),
        "phone" character varying(50),
        "license_number" character varying(100),
        "insurance_expiry" date,
        "rating" numeric(3,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendors" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendors_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vendors_org_id" ON "vendors" ("org_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "maintenance_tickets"
        ADD COLUMN "property_id" uuid,
        ADD COLUMN "unit_id" uuid,
        ADD COLUMN "tenant_id" uuid,
        ADD COLUMN "status" "maintenance_ticket_status" NOT NULL DEFAULT 'created',
        ADD COLUMN "ai_classification" jsonb,
        ADD COLUMN "assigned_vendor_id" uuid,
        ADD COLUMN "assigned_staff_id" uuid,
        ADD COLUMN "sla_due_at" TIMESTAMPTZ,
        ADD COLUMN "started_at" TIMESTAMPTZ,
        ADD COLUMN "completed_at" TIMESTAMPTZ,
        ADD COLUMN "invoiced_at" TIMESTAMPTZ,
        ADD COLUMN "closed_at" TIMESTAMPTZ,
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "deleted_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      UPDATE "maintenance_tickets" SET "status" = 'created' WHERE "status" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "maintenance_tickets"
        ALTER COLUMN "priority" SET DEFAULT 'medium'
    `);
    await queryRunner.query(`
      ALTER TABLE "maintenance_tickets"
        ADD CONSTRAINT "FK_maintenance_tickets_property_id" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE RESTRICT,
        ADD CONSTRAINT "FK_maintenance_tickets_unit_id" FOREIGN KEY ("unit_id")
          REFERENCES "units"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_maintenance_tickets_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_maintenance_tickets_assigned_vendor_id" FOREIGN KEY ("assigned_vendor_id")
          REFERENCES "vendors"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_maintenance_tickets_assigned_staff_id" FOREIGN KEY ("assigned_staff_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_maintenance_tickets_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_tickets_property_id" ON "maintenance_tickets" ("property_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_tickets_status" ON "maintenance_tickets" ("org_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_tickets_sla_due_at" ON "maintenance_tickets" ("sla_due_at")
      WHERE "sla_due_at" IS NOT NULL AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_updates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "ticket_id" uuid NOT NULL,
        "status_from" "maintenance_ticket_status",
        "status_to" "maintenance_ticket_status" NOT NULL,
        "note" text,
        "updated_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_updates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_updates_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ticket_updates_ticket_id" FOREIGN KEY ("ticket_id")
          REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ticket_updates_updated_by" FOREIGN KEY ("updated_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_updates_ticket_id" ON "ticket_updates" ("ticket_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "ticket_id" uuid NOT NULL,
        "file_name" character varying(500) NOT NULL,
        "file_size" bigint NOT NULL,
        "mime_type" character varying(255) NOT NULL,
        "storage_url" text NOT NULL,
        "storage_provider" "ticket_attachment_storage_provider" NOT NULL,
        "uploaded_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_attachments_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ticket_attachments_ticket_id" FOREIGN KEY ("ticket_id")
          REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ticket_attachments_uploaded_by" FOREIGN KEY ("uploaded_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_attachments_ticket_id" ON "ticket_attachments" ("ticket_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "vendor_invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "ticket_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "status" "vendor_invoice_status" NOT NULL DEFAULT 'pending',
        "due_date" date NOT NULL,
        "approved_by" uuid,
        "paid_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_invoices_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vendor_invoices_ticket_id" FOREIGN KEY ("ticket_id")
          REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vendor_invoices_vendor_id" FOREIGN KEY ("vendor_id")
          REFERENCES "vendors"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_vendor_invoices_approved_by" FOREIGN KEY ("approved_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vendor_invoices_ticket_id" ON "vendor_invoices" ("ticket_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_updates"`);
    await queryRunner.query(`
      ALTER TABLE "maintenance_tickets"
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_property_id",
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_unit_id",
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_tenant_id",
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_assigned_vendor_id",
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_assigned_staff_id",
        DROP CONSTRAINT IF EXISTS "FK_maintenance_tickets_created_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "maintenance_tickets"
        DROP COLUMN IF EXISTS "property_id",
        DROP COLUMN IF EXISTS "unit_id",
        DROP COLUMN IF EXISTS "tenant_id",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "ai_classification",
        DROP COLUMN IF EXISTS "assigned_vendor_id",
        DROP COLUMN IF EXISTS "assigned_staff_id",
        DROP COLUMN IF EXISTS "sla_due_at",
        DROP COLUMN IF EXISTS "started_at",
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "invoiced_at",
        DROP COLUMN IF EXISTS "closed_at",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "deleted_at"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendors"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vendor_invoice_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_attachment_storage_provider"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_ticket_status"`);
    await queryRunner.query(`
      ALTER TYPE "maintenance_ticket_priority" RENAME VALUE 'medium' TO 'normal'
    `);
    await queryRunner.query(`
      ALTER TYPE "maintenance_ticket_priority" RENAME VALUE 'critical' TO 'emergency'
    `);
  }
}
