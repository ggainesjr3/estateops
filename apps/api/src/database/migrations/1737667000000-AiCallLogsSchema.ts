import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiCallLogsSchema1737667000000 implements MigrationInterface {
  name = 'AiCallLogsSchema1737667000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_call_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "method" character varying(64) NOT NULL,
        "model" character varying(64) NOT NULL,
        "prompt_tokens" integer NOT NULL DEFAULT 0,
        "completion_tokens" integer NOT NULL DEFAULT 0,
        "latency_ms" integer NOT NULL,
        "success" boolean NOT NULL,
        "error_message" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_call_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_call_logs_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ai_call_logs_org_id" ON "ai_call_logs" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ai_call_logs_created_at" ON "ai_call_logs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_call_logs"`);
  }
}
