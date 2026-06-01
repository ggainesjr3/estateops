import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1737657600000 implements MigrationInterface {
  name = 'InitialSchema1737657600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "organization_plan" AS ENUM ('starter', 'pro', 'enterprise')
    `);
    await queryRunner.query(`
      CREATE TYPE "auth_provider_type" AS ENUM ('google', 'email')
    `);
    await queryRunner.query(`
      CREATE TYPE "membership_role" AS ENUM (
        'super_admin',
        'org_admin',
        'property_manager',
        'accountant',
        'maintenance_staff',
        'vendor',
        'tenant',
        'read_only'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "plan" "organization_plan" NOT NULL DEFAULT 'starter',
        "is_active" boolean NOT NULL DEFAULT true,
        "branding_logo_url" character varying(2048),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_organizations_slug" ON "organizations" ("slug")
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(320) NOT NULL,
        "password_hash" character varying(255),
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "avatar_url" character varying(2048),
        "is_active" boolean NOT NULL DEFAULT true,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "provider" "auth_provider_type" NOT NULL,
        "provider_user_id" character varying(255) NOT NULL,
        "access_token_hash" character varying(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_providers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_providers_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_auth_providers_user_id" ON "auth_providers" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "organization_memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "membership_role" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "invited_at" TIMESTAMPTZ,
        "joined_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_organization_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_organization_memberships_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_organization_memberships_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_organization_memberships_org_id"
        ON "organization_memberships" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_organization_memberships_user_id"
        ON "organization_memberships" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_organization_memberships_org_user"
        ON "organization_memberships" ("org_id", "user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid,
        "action" character varying(100) NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "ip_address" character varying(45),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_org_id" ON "audit_logs" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_providers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "membership_role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_provider_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_plan"`);
  }
}
