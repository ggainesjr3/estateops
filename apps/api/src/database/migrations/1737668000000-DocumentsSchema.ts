import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsSchema1737668000000 implements MigrationInterface {
  name = 'DocumentsSchema1737668000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_entity_type" AS ENUM (
        'lease', 'maintenance_ticket', 'tenant', 'meeting', 'financial'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "document_storage_provider" AS ENUM ('sharepoint', 's3')
    `);
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "entity_type" "document_entity_type" NOT NULL,
        "entity_id" uuid NOT NULL,
        "file_name" character varying(500) NOT NULL,
        "file_size" bigint NOT NULL,
        "mime_type" character varying(255) NOT NULL,
        "folder_path" character varying(1024) NOT NULL,
        "sharepoint_item_id" character varying(255),
        "sharepoint_web_url" text,
        "storage_provider" "document_storage_provider" NOT NULL,
        "uploaded_by" uuid,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_documents_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_documents_uploaded_by" FOREIGN KEY ("uploaded_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_documents_org_id" ON "documents" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_documents_entity" ON "documents" ("org_id", "entity_type", "entity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_documents_deleted_at" ON "documents" ("org_id")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_storage_provider"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_entity_type"`);
  }
}
