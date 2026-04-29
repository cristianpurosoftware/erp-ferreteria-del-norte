import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase A of the AI-first support feature.
 *
 * Adds two tables: `support_tickets` (the ticket itself) and
 * `support_ticket_events` (append-only timeline with comments, state
 * transitions, updates, and — in a later phase — agent activity).
 *
 * Does NOT create Tigris bindings or agent run tables; those ship with Fases B/C.
 */
export class CreateSupportTickets1776550000000 implements MigrationInterface {
  name = 'CreateSupportTickets1776550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "support_tickets" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "priority" character varying NOT NULL DEFAULT 'normal',
        "app_env" character varying,
        "status" character varying NOT NULL DEFAULT 'created',
        "created_by_user_id" varchar(40) NOT NULL,
        "resolved_by_user_id" varchar(40),
        "resolved_at" TIMESTAMP,
        "last_activity_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_tickets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_support_tickets_status" ON "support_tickets" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_support_tickets_created_by" ON "support_tickets" ("created_by_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_support_tickets_last_activity" ON "support_tickets" ("last_activity_at")`);

    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD CONSTRAINT "FK_support_tickets_created_by"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD CONSTRAINT "FK_support_tickets_resolved_by"
      FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "support_ticket_events" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "ticket_id" varchar(40) NOT NULL,
        "event_type" character varying NOT NULL,
        "actor_user_id" varchar(40),
        "actor_type" character varying NOT NULL DEFAULT 'user',
        "body" text,
        "payload" jsonb,
        CONSTRAINT "PK_support_ticket_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_support_ticket_events_ticket" ON "support_ticket_events" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_support_ticket_events_type" ON "support_ticket_events" ("event_type")`);

    await queryRunner.query(`
      ALTER TABLE "support_ticket_events"
      ADD CONSTRAINT "FK_support_ticket_events_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_events"
      ADD CONSTRAINT "FK_support_ticket_events_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ── Seed new permissions and link to admin role ─────────────────────
    // Admin (system role) always owns every permission; regular base roles
    // are left untouched so each client decides who can see /soporte.
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "section", "description")
      VALUES
        ('support_tickets:view',    'support_tickets', 'support_tickets:view'),
        ('support_tickets:create',  'support_tickets', 'support_tickets:create'),
        ('support_tickets:update',  'support_tickets', 'support_tickets:update'),
        ('support_tickets:comment', 'support_tickets', 'support_tickets:comment'),
        ('support_tickets:resolve', 'support_tickets', 'support_tickets:resolve')
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."name" = 'admin'
        AND p."name" IN (
          'support_tickets:view',
          'support_tickets:create',
          'support_tickets:update',
          'support_tickets:comment',
          'support_tickets:resolve'
        )
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
        SELECT "id" FROM "permissions" WHERE "name" LIKE 'support_tickets:%'
      )
    `);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "name" LIKE 'support_tickets:%'`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_ticket_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
  }
}
