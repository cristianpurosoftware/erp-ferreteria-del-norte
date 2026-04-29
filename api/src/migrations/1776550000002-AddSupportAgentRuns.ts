import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase C — Hermes agent run tracking.
 *
 * Each row represents one attempt at delegating a support ticket to Hermes.
 * The SSE consumer streams per-event activity into support_ticket_events
 * with actor_type='agent'; this table keeps the coarse per-attempt state
 * so the UI can show "working / completed / failed" and we can retry.
 *
 * Also adds the new dispatch_agent permission and links it to admin.
 */
export class AddSupportAgentRuns1776550000002 implements MigrationInterface {
  name = 'AddSupportAgentRuns1776550000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        CONSTRAINT "PK_support_agent_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_support_agent_runs_ticket" ON "support_agent_runs" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_support_agent_runs_status" ON "support_agent_runs" ("status")`);
    await queryRunner.query(`
      ALTER TABLE "support_agent_runs"
      ADD CONSTRAINT "FK_support_agent_runs_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "section", "description")
      VALUES ('support_tickets:dispatch_agent', 'support_tickets', 'support_tickets:dispatch_agent')
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."name" = 'admin'
        AND p."name" = 'support_tickets:dispatch_agent'
        AND NOT EXISTS (
          SELECT 1 FROM "role_permissions" rp
          WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "name" = 'support_tickets:dispatch_agent'
      )
    `);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "name" = 'support_tickets:dispatch_agent'`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_agent_runs"`);
  }
}
