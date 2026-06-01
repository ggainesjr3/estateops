import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoicesPaymentsSchema1737664000000 implements MigrationInterface {
  name = 'InvoicesPaymentsSchema1737664000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invoice_type" AS ENUM (
        'rent', 'late_fee', 'security_deposit', 'maintenance', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "invoice_status" AS ENUM (
        'draft', 'sent', 'partial', 'paid', 'void', 'overdue'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "stored_payment_method_type" AS ENUM ('ach', 'card')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_instrument" AS ENUM (
        'ach', 'card', 'check', 'cash', 'wire'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_transaction_status" AS ENUM (
        'pending', 'processing', 'succeeded', 'failed',
        'refunded', 'disputed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "lease_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "invoice_number" character varying(64) NOT NULL,
        "type" "invoice_type" NOT NULL,
        "status" "invoice_status" NOT NULL DEFAULT 'draft',
        "amount_due" NUMERIC(15,2) NOT NULL,
        "amount_paid" NUMERIC(15,2) NOT NULL DEFAULT 0,
        "due_date" date NOT NULL,
        "sent_at" TIMESTAMPTZ,
        "paid_at" TIMESTAMPTZ,
        "voided_at" TIMESTAMPTZ,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoices_lease_id" FOREIGN KEY ("lease_id")
          REFERENCES "leases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invoices_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invoices_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_invoices_org_invoice_number"
        ON "invoices" ("org_id", "invoice_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_org_id" ON "invoices" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_lease_id" ON "invoices" ("lease_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_tenant_id" ON "invoices" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_methods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "stripe_payment_method_id" character varying(255) NOT NULL,
        "type" "stored_payment_method_type" NOT NULL,
        "bank_last4" character varying(4),
        "card_last4" character varying(4),
        "is_default" boolean NOT NULL DEFAULT false,
        "plaid_access_token_encrypted" text,
        "verified_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_methods_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payment_methods_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_payment_methods_org_tenant"
        ON "payment_methods" ("org_id", "tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "invoice_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "stripe_payment_intent_id" character varying(255),
        "stripe_charge_id" character varying(255),
        "method" "payment_instrument" NOT NULL,
        "status" "payment_transaction_status" NOT NULL DEFAULT 'pending',
        "amount" NUMERIC(15,2) NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "failure_reason" text,
        "processed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payments_invoice_id" FOREIGN KEY ("invoice_id")
          REFERENCES "invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payments_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_payments_stripe_payment_intent_id"
        ON "payments" ("stripe_payment_intent_id")
        WHERE "stripe_payment_intent_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_payments_org_idempotency"
        ON "payments" ("org_id", "idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_payments_org_id" ON "payments" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_payments_invoice_id" ON "payments" ("invoice_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_transaction_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_instrument"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stored_payment_method_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_type"`);
  }
}
