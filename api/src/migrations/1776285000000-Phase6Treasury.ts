import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6Treasury1776285000000 implements MigrationInterface {
  name = 'Phase6Treasury1776285000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // bank_accounts
    await queryRunner.query(`
      CREATE TABLE "bank_accounts" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "name" character varying NOT NULL,
        "bank_name" character varying NOT NULL,
        "cbu" character varying,
        "alias" character varying,
        "currency" character varying NOT NULL DEFAULT 'ARS',
        "account_number" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_bank_accounts_cbu" UNIQUE ("cbu"),
        CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id")
      )
    `);

    // checks
    await queryRunner.query(`
      CREATE TABLE "checks" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" character varying NOT NULL,
        "bank_name" character varying NOT NULL,
        "branch" character varying,
        "account_holder" character varying NOT NULL,
        "cuit" character varying,
        "amount" numeric(12,2) NOT NULL,
        "issue_date" date NOT NULL,
        "due_date" date NOT NULL,
        "kind" character varying NOT NULL DEFAULT 'common',
        "own_or_third" character varying NOT NULL DEFAULT 'third',
        "received_from_customer_id" varchar(40),
        "endorsed_to_supplier_id" varchar(40),
        "bank_account_id" varchar(40),
        "status" character varying NOT NULL DEFAULT 'received',
        "deposited_at" TIMESTAMP,
        "cleared_at" TIMESTAMP,
        "bounced_at" TIMESTAMP,
        "bounce_reason" character varying,
        CONSTRAINT "PK_checks" PRIMARY KEY ("id")
      )
    `);

    // collector_renditions
    await queryRunner.query(`
      CREATE TABLE "collector_renditions" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "collector_id" varchar(40) NOT NULL,
        "shipment_id" varchar(40),
        "date" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'draft',
        "total_cash" numeric(12,2) NOT NULL DEFAULT 0,
        "total_checks" numeric(12,2) NOT NULL DEFAULT 0,
        "total_transfers" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "approved_by" varchar(40),
        "approved_at" TIMESTAMP,
        "notes" text,
        CONSTRAINT "PK_collector_renditions" PRIMARY KEY ("id")
      )
    `);

    // collector_rendition_lines
    await queryRunner.query(`
      CREATE TABLE "collector_rendition_lines" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "collector_rendition_id" varchar(40) NOT NULL,
        "payment_id" varchar(40) NOT NULL,
        "declared_amount" numeric(12,2) NOT NULL,
        "accepted_amount" numeric(12,2),
        "difference" numeric(12,2),
        "reason" character varying,
        CONSTRAINT "PK_collector_rendition_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "collector_rendition_lines" ADD CONSTRAINT "FK_crl_rendition"
      FOREIGN KEY ("collector_rendition_id") REFERENCES "collector_renditions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // bank_statements
    await queryRunner.query(`
      CREATE TABLE "bank_statements" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "bank_account_id" varchar(40) NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "opening_balance" numeric(12,2) NOT NULL DEFAULT 0,
        "closing_balance" numeric(12,2) NOT NULL DEFAULT 0,
        "imported_at" TIMESTAMP NOT NULL DEFAULT now(),
        "source" character varying NOT NULL DEFAULT 'manual',
        "status" character varying NOT NULL DEFAULT 'imported',
        CONSTRAINT "PK_bank_statements" PRIMARY KEY ("id")
      )
    `);

    // bank_statement_lines
    await queryRunner.query(`
      CREATE TABLE "bank_statement_lines" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "bank_statement_id" varchar(40) NOT NULL,
        "date" date NOT NULL,
        "description" character varying NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "kind" character varying NOT NULL,
        "external_reference" character varying,
        "matched" boolean NOT NULL DEFAULT false,
        "reconciliation_match_id" varchar(40),
        CONSTRAINT "PK_bank_statement_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "FK_bank_statement_lines_stmt"
      FOREIGN KEY ("bank_statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // reconciliation_matches
    await queryRunner.query(`
      CREATE TABLE "reconciliation_matches" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "bank_statement_line_id" varchar(40) NOT NULL,
        "payment_id" varchar(40),
        "check_id" varchar(40),
        "amount" numeric(12,2) NOT NULL,
        "matched_by" varchar(40),
        "matched_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" character varying NOT NULL DEFAULT 'proposed',
        CONSTRAINT "PK_reconciliation_matches" PRIMARY KEY ("id")
      )
    `);

    // withholdings
    await queryRunner.query(`
      CREATE TABLE "withholdings" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "kind" character varying NOT NULL,
        "direction" character varying NOT NULL,
        "jurisdiction_id" varchar(40),
        "tax_id" varchar(40),
        "customer_id" varchar(40),
        "supplier_id" varchar(40),
        "payment_id" varchar(40),
        "invoice_id" varchar(40),
        "supplier_invoice_id" varchar(40),
        "amount" numeric(12,2) NOT NULL,
        "certificate_number" character varying,
        "date" date NOT NULL,
        CONSTRAINT "PK_withholdings" PRIMARY KEY ("id")
      )
    `);

    // withholding_padrones
    await queryRunner.query(`
      CREATE TABLE "withholding_padrones" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "kind" character varying NOT NULL,
        "jurisdiction_id" varchar(40),
        "cuit" character varying NOT NULL,
        "rate_perception" numeric(6,3),
        "rate_withholding" numeric(6,3),
        "valid_from" date NOT NULL,
        "valid_to" date,
        "source" character varying,
        CONSTRAINT "UQ_withholding_padrones_tuple" UNIQUE ("kind", "jurisdiction_id", "cuit", "valid_from"),
        CONSTRAINT "PK_withholding_padrones" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_withholding_padrones_cuit" ON "withholding_padrones" ("cuit")
    `);

    // payment_batches
    await queryRunner.query(`
      CREATE TABLE "payment_batches" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "bank_account_id" varchar(40) NOT NULL,
        "date" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'draft',
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "file_url" character varying,
        CONSTRAINT "PK_payment_batches" PRIMARY KEY ("id")
      )
    `);

    // payment_orders
    await queryRunner.query(`
      CREATE TABLE "payment_orders" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "supplier_id" varchar(40) NOT NULL,
        "date" date NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'ARS',
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'draft',
        "payment_batch_id" varchar(40),
        "notes" text,
        CONSTRAINT "PK_payment_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_orders" ADD CONSTRAINT "FK_payment_orders_batch"
      FOREIGN KEY ("payment_batch_id") REFERENCES "payment_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ALTER payments
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "direction" character varying NOT NULL DEFAULT 'in',
      ADD COLUMN "collector_id" varchar(40),
      ADD COLUMN "check_id" varchar(40),
      ADD COLUMN "bank_account_id" varchar(40),
      ADD COLUMN "collector_rendition_id" varchar(40),
      ADD COLUMN "invoice_id" varchar(40),
      ADD COLUMN "payment_order_id" varchar(40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "payment_order_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "invoice_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "collector_rendition_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "bank_account_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "check_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "collector_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "direction"`);

    await queryRunner.query(`DROP TABLE "payment_orders"`);
    await queryRunner.query(`DROP TABLE "payment_batches"`);
    await queryRunner.query(`DROP TABLE "withholding_padrones"`);
    await queryRunner.query(`DROP TABLE "withholdings"`);
    await queryRunner.query(`DROP TABLE "reconciliation_matches"`);
    await queryRunner.query(`DROP TABLE "bank_statement_lines"`);
    await queryRunner.query(`DROP TABLE "bank_statements"`);
    await queryRunner.query(`DROP TABLE "collector_rendition_lines"`);
    await queryRunner.query(`DROP TABLE "collector_renditions"`);
    await queryRunner.query(`DROP TABLE "checks"`);
    await queryRunner.query(`DROP TABLE "bank_accounts"`);
  }
}
