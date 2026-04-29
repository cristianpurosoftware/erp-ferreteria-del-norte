import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a human-friendly auto-incrementing `ticket_number` to support tickets
 * so the UI can show "#0042" instead of a UUID. The UUID `id` remains the
 * primary key and the referent for every foreign key and API route.
 */
export class AddSupportTicketNumber1776550000003 implements MigrationInterface {
  name = 'AddSupportTicketNumber1776550000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD COLUMN "ticket_number" SERIAL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_support_tickets_ticket_number"
      ON "support_tickets" ("ticket_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_support_tickets_ticket_number"`);
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "ticket_number"`);
  }
}
