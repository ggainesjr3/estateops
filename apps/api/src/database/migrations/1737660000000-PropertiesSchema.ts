import { MigrationInterface, QueryRunner } from 'typeorm';

export class PropertiesSchema1737660000000 implements MigrationInterface {
  name = 'PropertiesSchema1737660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "property_type" AS ENUM ('residential', 'commercial', 'mixed_use')
    `);
    await queryRunner.query(`
      CREATE TYPE "property_status" AS ENUM ('active', 'inactive', 'sold')
    `);
    await queryRunner.query(`
      CREATE TYPE "unit_type" AS ENUM (
        'studio', '1br', '2br', '3br', '4br_plus', 'commercial', 'storage'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "unit_status" AS ENUM ('vacant', 'occupied', 'maintenance', 'off_market')
    `);

    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "type" "property_type" NOT NULL,
        "address_line1" character varying(255) NOT NULL,
        "address_line2" character varying(255),
        "city" character varying(100) NOT NULL,
        "state" character varying(100) NOT NULL,
        "postal_code" character varying(20) NOT NULL,
        "country" character varying(100) NOT NULL DEFAULT 'US',
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "status" "property_status" NOT NULL DEFAULT 'active',
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_properties" PRIMARY KEY ("id"),
        CONSTRAINT "FK_properties_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_properties_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_properties_org_id" ON "properties" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_properties_org_city" ON "properties" ("org_id", "city")
    `);

    await queryRunner.query(`
      CREATE TABLE "buildings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "floors_count" integer,
        "year_built" integer,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_buildings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_buildings_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_buildings_property_id" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_buildings_org_id" ON "buildings" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_buildings_property_id" ON "buildings" ("property_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "units" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "building_id" uuid,
        "floor_number" integer,
        "unit_number" character varying(50) NOT NULL,
        "type" "unit_type" NOT NULL,
        "sqft" numeric(10,2),
        "bedrooms" integer,
        "bathrooms" numeric(4,2),
        "status" "unit_status" NOT NULL DEFAULT 'vacant',
        "monthly_rent" numeric(12,2),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_units" PRIMARY KEY ("id"),
        CONSTRAINT "FK_units_org_id" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_units_property_id" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_units_building_id" FOREIGN KEY ("building_id")
          REFERENCES "buildings"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_units_org_id" ON "units" ("org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_units_property_id" ON "units" ("property_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_units_property_unit_number"
        ON "units" ("property_id", "unit_number")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "units"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "buildings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "unit_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "unit_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_type"`);
  }
}
