import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePosSales1776600000000 implements MigrationInterface {
  name = 'CreatePosSales1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pos_sales" (
        "id"               varchar(40)       NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP         NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMP,
        "metadata"         jsonb,
        "customer_id"      varchar(40),
        "order_id"         varchar(40)       NOT NULL,
        "invoice_id"       varchar(40),
        "warehouse_id"     varchar(40)       NOT NULL,
        "user_id"          varchar(40)       NOT NULL,
        "subtotal"         numeric(12,2)     NOT NULL DEFAULT 0,
        "discount"         numeric(12,2)     NOT NULL DEFAULT 0,
        "taxes"            numeric(12,2)     NOT NULL DEFAULT 0,
        "total"            numeric(12,2)     NOT NULL DEFAULT 0,
        "payment_breakdown" jsonb            NOT NULL DEFAULT '[]',
        "status"           character varying NOT NULL DEFAULT 'completed',
        "voided_at"        TIMESTAMPTZ,
        "voided_by"        varchar(40),
        CONSTRAINT "PK_pos_sales_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pos_sales_user_created"
        ON "pos_sales" ("user_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pos_sales_order"
        ON "pos_sales" ("order_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pos_sales_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pos_sales_user_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pos_sales"`);
  }
}
