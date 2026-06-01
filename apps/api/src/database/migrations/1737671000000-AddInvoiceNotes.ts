import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceNotes1737671000000 implements MigrationInterface {
  name = 'AddInvoiceNotes1737671000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD COLUMN IF NOT EXISTS "notes" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "notes"`);
  }
}
