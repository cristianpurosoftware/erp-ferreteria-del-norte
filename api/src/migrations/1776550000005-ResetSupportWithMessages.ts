import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resets the support module to the new chat-centric model.
 *
 * - Truncates all support_* tables (test data only, confirmed with operator).
 * - Creates `support_ticket_messages` as the canonical chat source:
 *   sender_role (customer | support | system), sender_kind (user | ai | system),
 *   body, status, metadata.
 * - Adds nullable `message_id` on `support_ticket_attachments` so uploads can
 *   be associated with the specific message they were attached to.
 * - Drops `support_agent_runs` — AI requests are now issued synchronously via
 *   the AI SDK and persisted as support messages; the audit trail stays in
 *   `support_ticket_events` when we need to record tool invocations.
 */
export class ResetSupportWithMessages1776550000005 implements MigrationInterface {
  name = 'ResetSupportWithMessages1776550000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      TRUNCATE TABLE
        "support_agent_runs",
        "support_ticket_attachments",
        "support_ticket_events",
        "support_tickets"
      RESTART IDENTITY CASCADE
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "support_agent_runs"`);

    await queryRunner.query(`
      CREATE TABLE "support_ticket_messages" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "ticket_id" varchar(40) NOT NULL,
        "sender_role" character varying NOT NULL,
        "sender_kind" character varying NOT NULL,
        "sender_user_id" varchar(40),
        "body" text,
        "status" character varying NOT NULL DEFAULT 'sent',
        CONSTRAINT "PK_support_ticket_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_support_ticket_messages_ticket"
          FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_support_ticket_messages_ticket"
        ON "support_ticket_messages" ("ticket_id", "created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "support_ticket_attachments"
      ADD COLUMN "message_id" varchar(40)
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_attachments"
      ADD CONSTRAINT "FK_support_ticket_attachments_message"
        FOREIGN KEY ("message_id") REFERENCES "support_ticket_messages"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_support_ticket_attachments_message"
        ON "support_ticket_attachments" ("message_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_ticket_attachments_message"`);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_attachments"
      DROP CONSTRAINT IF EXISTS "FK_support_ticket_attachments_message"
    `);
    await queryRunner.query(`ALTER TABLE "support_ticket_attachments" DROP COLUMN IF EXISTS "message_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_ticket_messages_ticket"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_ticket_messages"`);

    await queryRunner.query(`
      CREATE TABLE "support_agent_runs" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "ticket_id" varchar(40) NOT NULL,
        "conversation_key" character varying NOT NULL,
        "hermes_run_id" character varying,
        "status" character varying NOT NULL DEFAULT 'queued',
        "attempts" integer NOT NULL DEFAULT 0,
        "request_payload" jsonb,
        "response_summary" jsonb,
        "error" text,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_support_agent_runs_id" PRIMARY KEY ("id")
      )
    `);
  }
}
