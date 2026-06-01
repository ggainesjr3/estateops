import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetingArchivesSchema1737670000000 implements MigrationInterface {
  name = 'MeetingArchivesSchema1737670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "meeting_archive_status" AS ENUM (
        'received', 'processing', 'uploaded', 'summarized', 'failed'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "zoom_user_id" character varying(64)
    `);

    await queryRunner.query(`
      CREATE TABLE "meeting_archives" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "zoom_meeting_id" character varying(64) NOT NULL,
        "zoom_uuid" character varying(128) NOT NULL,
        "topic" character varying(500) NOT NULL,
        "host_user_id" uuid,
        "host_zoom_user_id" character varying(64),
        "started_at" TIMESTAMPTZ,
        "ended_at" TIMESTAMPTZ,
        "duration_seconds" integer,
        "property_id" uuid,
        "sharepoint_recording_url" character varying(2048),
        "sharepoint_transcript_url" character varying(2048),
        "sharepoint_recording_item_id" character varying(255),
        "sharepoint_transcript_item_id" character varying(255),
        "ai_summary" jsonb,
        "status" "meeting_archive_status" NOT NULL DEFAULT 'received',
        "participants" jsonb NOT NULL DEFAULT '[]',
        "recording_files" jsonb NOT NULL DEFAULT '[]',
        "failure_reason" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_archives" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meeting_archives_org" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_meeting_archives_host" FOREIGN KEY ("host_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_meeting_archives_property" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_meeting_archives_org_created"
        ON "meeting_archives" ("org_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_meeting_archives_org_zoom_uuid"
        ON "meeting_archives" ("org_id", "zoom_uuid")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_meeting_archives_search"
        ON "meeting_archives"
        USING gin (to_tsvector('english', coalesce("topic", '') || ' ' || coalesce("ai_summary"::text, '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting_archives"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "zoom_user_id"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meeting_archive_status"`);
  }
}
