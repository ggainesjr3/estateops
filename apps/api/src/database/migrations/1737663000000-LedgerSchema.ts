import { MigrationInterface, QueryRunner } from 'typeorm';

export class LedgerSchema1737663000000 implements MigrationInterface {
  name = 'LedgerSchema1737663000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ledger_account_type" AS ENUM (
        'asset', 'liability', 'equity', 'revenue', 'expense'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_entry_type" AS ENUM ('debit', 'credit')
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_reference_type" AS ENUM (
        'payment', 'invoice', 'refund', 'journal_entry',
        'security_deposit', 'late_fee'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "code" character varying(32) NOT NULL,
        "type" "ledger_account_type" NOT NULL,
        "subtype" character varying(64),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ledger_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledger_accounts_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_ledger_accounts_org_code"
        ON "ledger_accounts" ("org_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_accounts_org_id" ON "ledger_accounts" ("org_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "description" character varying(500) NOT NULL,
        "reference_type" "ledger_reference_type" NOT NULL,
        "reference_id" uuid,
        "posted_at" TIMESTAMPTZ NOT NULL,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ledger_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledger_transactions_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ledger_transactions_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_ledger_transactions_org_idempotency"
        ON "ledger_transactions" ("org_id", "idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_transactions_org_id" ON "ledger_transactions" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_transactions_posted_at"
        ON "ledger_transactions" ("org_id", "posted_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "type" "ledger_entry_type" NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ledger_entries_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "FK_ledger_entries_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ledger_entries_transaction_id" FOREIGN KEY ("transaction_id")
          REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ledger_entries_account_id" FOREIGN KEY ("account_id")
          REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_org_id" ON "ledger_entries" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_transaction_id"
        ON "ledger_entries" ("transaction_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_account_id"
        ON "ledger_entries" ("account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_account_created"
        ON "ledger_entries" ("account_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_ledger_immutable_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'ledger % records are immutable', TG_TABLE_NAME;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_ledger_transactions_immutable"
      BEFORE UPDATE OR DELETE ON "ledger_transactions"
      FOR EACH ROW EXECUTE FUNCTION prevent_ledger_immutable_mutation()
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_ledger_entries_immutable"
      BEFORE UPDATE OR DELETE ON "ledger_entries"
      FOR EACH ROW EXECUTE FUNCTION prevent_ledger_immutable_mutation()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assert_ledger_transaction_balanced()
      RETURNS TRIGGER AS $$
      DECLARE
        total_debits numeric(15,2);
        total_credits numeric(15,2);
      BEGIN
        SELECT
          COALESCE(SUM(CASE WHEN "type" = 'debit' THEN "amount" ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN "type" = 'credit' THEN "amount" ELSE 0 END), 0)
        INTO total_debits, total_credits
        FROM "ledger_entries"
        WHERE "transaction_id" = NEW."transaction_id";

        IF total_debits <> total_credits THEN
          RAISE EXCEPTION 'ledger transaction % is not balanced (debits=%, credits=%)',
            NEW."transaction_id", total_debits, total_credits;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER "trg_ledger_entries_balanced"
      AFTER INSERT ON "ledger_entries"
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION assert_ledger_transaction_balanced()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_ledger_entries_balanced" ON "ledger_entries"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS assert_ledger_transaction_balanced()`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_ledger_entries_immutable" ON "ledger_entries"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_ledger_transactions_immutable" ON "ledger_transactions"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_ledger_immutable_mutation()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_accounts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_reference_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entry_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_account_type"`);
  }
}
