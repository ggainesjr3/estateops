import { MigrationInterface, QueryRunner } from 'typeorm';

export class QueueInfrastructureSchema1737665000000 implements MigrationInterface {
  name = 'QueueInfrastructureSchema1737665000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "failed_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "queue_name" character varying(128) NOT NULL,
        "job_id" character varying(255),
        "job_name" character varying(255),
        "payload" jsonb NOT NULL DEFAULT '{}',
        "error_message" text NOT NULL,
        "stack_trace" text,
        "attempts" integer NOT NULL DEFAULT 0,
        "failed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_failed_jobs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_failed_jobs_queue_name" ON "failed_jobs" ("queue_name")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_failed_jobs_failed_at" ON "failed_jobs" ("failed_at")
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_ticket_priority" AS ENUM (
        'low', 'normal', 'high', 'emergency'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "maintenance_trade" AS ENUM (
        'general', 'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'landscaping'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "maintenance_tickets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "description" text,
        "priority" "maintenance_ticket_priority" NOT NULL DEFAULT 'normal',
        "trade" "maintenance_trade" NOT NULL DEFAULT 'general',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenance_tickets_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_tickets_org_id" ON "maintenance_tickets" ("org_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_tickets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_trade"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_ticket_priority"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "failed_jobs"`);
  }
}
