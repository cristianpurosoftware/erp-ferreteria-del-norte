import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5FiscalAR1776284000000 implements MigrationInterface {
  name = 'Phase5FiscalAR1776284000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // jurisdictions
    await queryRunner.query(`
      CREATE TABLE "jurisdictions" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "kind" character varying NOT NULL DEFAULT 'provincial',
        "parent_jurisdiction_id" varchar(40),
        CONSTRAINT "UQ_jurisdictions_code" UNIQUE ("code"),
        CONSTRAINT "PK_jurisdictions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "jurisdictions" ADD CONSTRAINT "FK_jurisdictions_parent"
      FOREIGN KEY ("parent_jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // customer_jurisdictions
    await queryRunner.query(`
      CREATE TABLE "customer_jurisdictions" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "customer_id" varchar(40) NOT NULL,
        "jurisdiction_id" varchar(40) NOT NULL,
        "condition" character varying NOT NULL DEFAULT 'inscripto',
        "inscription_number" character varying,
        "since" date,
        "until" date,
        CONSTRAINT "PK_customer_jurisdictions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_jurisdictions_cust" ON "customer_jurisdictions" ("customer_id")
    `);

    // delivery_notes
    await queryRunner.query(`
      CREATE TABLE "delivery_notes" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" character varying NOT NULL,
        "sales_point" character varying,
        "invoice_type" character varying NOT NULL DEFAULT 'X',
        "issue_date" date NOT NULL,
        "customer_id" varchar(40) NOT NULL,
        "order_id" varchar(40),
        "shipment_stop_id" varchar(40),
        "warehouse_id" varchar(40),
        "driver_id" varchar(40),
        "vehicle_id" varchar(40),
        "status" character varying NOT NULL DEFAULT 'draft',
        "invoice_id" varchar(40),
        "cae" character varying,
        "cae_expiration" date,
        CONSTRAINT "UQ_delivery_notes_number" UNIQUE ("number"),
        CONSTRAINT "PK_delivery_notes" PRIMARY KEY ("id")
      )
    `);

    // delivery_note_items
    await queryRunner.query(`
      CREATE TABLE "delivery_note_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "delivery_note_id" varchar(40) NOT NULL,
        "product_id" varchar(40) NOT NULL,
        "lot_id" varchar(40),
        "order_item_id" varchar(40),
        "quantity" numeric(12,2) NOT NULL,
        "unit_price" numeric(12,2),
        CONSTRAINT "PK_delivery_note_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "delivery_note_items" ADD CONSTRAINT "FK_delivery_note_items_dn"
      FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // credit_notes
    await queryRunner.query(`
      CREATE TABLE "credit_notes" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" character varying,
        "sales_point" character varying,
        "invoice_type" character varying NOT NULL DEFAULT 'A',
        "issue_date" date,
        "customer_id" varchar(40) NOT NULL,
        "original_invoice_id" varchar(40) NOT NULL,
        "jurisdiction_id" varchar(40),
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "taxes" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "reason" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "cae" character varying,
        "cae_expiration" date,
        CONSTRAINT "PK_credit_notes" PRIMARY KEY ("id")
      )
    `);

    // credit_note_items
    await queryRunner.query(`
      CREATE TABLE "credit_note_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "credit_note_id" varchar(40) NOT NULL,
        "product_id" varchar(40),
        "description" character varying NOT NULL,
        "quantity" numeric(12,2) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_credit_note_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "credit_note_items" ADD CONSTRAINT "FK_credit_note_items_cn"
      FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // debit_notes
    await queryRunner.query(`
      CREATE TABLE "debit_notes" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" character varying,
        "sales_point" character varying,
        "invoice_type" character varying NOT NULL DEFAULT 'A',
        "issue_date" date,
        "customer_id" varchar(40) NOT NULL,
        "original_invoice_id" varchar(40) NOT NULL,
        "jurisdiction_id" varchar(40),
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "taxes" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "reason" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "cae" character varying,
        "cae_expiration" date,
        CONSTRAINT "PK_debit_notes" PRIMARY KEY ("id")
      )
    `);

    // debit_note_items
    await queryRunner.query(`
      CREATE TABLE "debit_note_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "debit_note_id" varchar(40) NOT NULL,
        "product_id" varchar(40),
        "description" character varying NOT NULL,
        "quantity" numeric(12,2) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_debit_note_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "debit_note_items" ADD CONSTRAINT "FK_debit_note_items_dn"
      FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // fiscal_authorizations
    await queryRunner.query(`
      CREATE TABLE "fiscal_authorizations" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "document_type" character varying NOT NULL,
        "document_id" varchar(40) NOT NULL,
        "provider" character varying NOT NULL DEFAULT 'afip',
        "cae" character varying,
        "cae_expiration" date,
        "requested_at" TIMESTAMP NOT NULL DEFAULT now(),
        "granted_at" TIMESTAMP,
        "request_payload" jsonb,
        "response_payload" jsonb,
        "status" character varying NOT NULL DEFAULT 'requested',
        CONSTRAINT "PK_fiscal_authorizations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_fiscal_authorizations_doc" ON "fiscal_authorizations" ("document_type", "document_id")
    `);

    // ALTER invoices
    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD COLUMN "cae" character varying,
      ADD COLUMN "cae_expiration" date,
      ADD COLUMN "sales_point" character varying,
      ADD COLUMN "invoice_type" character varying,
      ADD COLUMN "jurisdiction_id" varchar(40),
      ADD COLUMN "original_invoice_id" varchar(40),
      ADD COLUMN "delivery_note_id" varchar(40),
      ADD COLUMN "shipment_stop_id" varchar(40)
    `);

    // ALTER taxes
    await queryRunner.query(`
      ALTER TABLE "taxes"
      ADD COLUMN "jurisdiction_id" varchar(40),
      ADD COLUMN "kind" character varying NOT NULL DEFAULT 'iva',
      ADD COLUMN "is_perception" boolean NOT NULL DEFAULT false,
      ADD COLUMN "is_withholding" boolean NOT NULL DEFAULT false,
      ADD COLUMN "rate_type" character varying NOT NULL DEFAULT 'percentage'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "rate_type"`);
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "is_withholding"`);
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "is_perception"`);
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "kind"`);
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "jurisdiction_id"`);

    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "shipment_stop_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "delivery_note_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "original_invoice_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "jurisdiction_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "invoice_type"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "sales_point"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "cae_expiration"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "cae"`);

    await queryRunner.query(`DROP TABLE "fiscal_authorizations"`);
    await queryRunner.query(`DROP TABLE "debit_note_items"`);
    await queryRunner.query(`DROP TABLE "debit_notes"`);
    await queryRunner.query(`DROP TABLE "credit_note_items"`);
    await queryRunner.query(`DROP TABLE "credit_notes"`);
    await queryRunner.query(`DROP TABLE "delivery_note_items"`);
    await queryRunner.query(`DROP TABLE "delivery_notes"`);
    await queryRunner.query(`DROP TABLE "customer_jurisdictions"`);
    await queryRunner.query(`DROP TABLE "jurisdictions"`);
  }
}
