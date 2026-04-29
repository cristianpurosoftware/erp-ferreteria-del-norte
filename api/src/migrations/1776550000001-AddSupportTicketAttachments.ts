import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase B — Tigris-backed attachments for support tickets.
 *
 * Stores only metadata; the file content lives in Tigris (S3-compatible)
 * under the key `{CLIENT_SLUG}/soporte/{ticketId}/adjuntos/{attachmentId}-{safeName}`.
 */
export class AddSupportTicketAttachments1776550000001 implements MigrationInterface {
  name = 'AddSupportTicketAttachments1776550000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "support_ticket_attachments" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "ticket_id" varchar(40) NOT NULL,
        "file_name" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "size_bytes" bigint NOT NULL,
        "storage_key" character varying NOT NULL,
        "uploaded_by_user_id" varchar(40) NOT NULL,
        CONSTRAINT "PK_support_ticket_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_support_ticket_attachments_ticket" ON "support_ticket_attachments" ("ticket_id")`);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_attachments"
      ADD CONSTRAINT "FK_support_ticket_attachments_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_attachments"
      ADD CONSTRAINT "FK_support_ticket_attachments_uploader"
      FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "support_ticket_attachments"`);
  }
}
