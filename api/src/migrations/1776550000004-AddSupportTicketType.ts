import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `type` (bug | question | change) and `agent_state` columns to
 * support tickets. `type` is used by the list filter and the new detail
 * page; `agent_state` drives the sidebar actions layout.
 */
export class AddSupportTicketType1776550000004 implements MigrationInterface {
  name = 'AddSupportTicketType1776550000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD COLUMN "type" character varying NOT NULL DEFAULT 'bug'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_type" ON "support_tickets" ("type")
    `);

    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD COLUMN "agent_state" character varying NOT NULL DEFAULT 'idle'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_tickets_type"`);
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "type"`);
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "agent_state"`);
  }
}
