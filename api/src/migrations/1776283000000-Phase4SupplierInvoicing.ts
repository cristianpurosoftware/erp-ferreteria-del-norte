import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4SupplierInvoicing1776283000000 implements MigrationInterface {
  name = 'Phase4SupplierInvoicing1776283000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // supplier_delivery_notes
    await queryRunner.query(`
      CREATE TABLE "supplier_delivery_notes" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "supplier_id" varchar(40) NOT NULL,
        "supplier_delivery_note_number" character varying NOT NULL,
        "purchase_order_id" varchar(40),
        "warehouse_id" varchar(40) NOT NULL,
        "received_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" character varying NOT NULL DEFAULT 'draft',
        CONSTRAINT "PK_supplier_delivery_notes" PRIMARY KEY ("id")
      )
    `);

    // supplier_invoices
    await queryRunner.query(`
      CREATE TABLE "supplier_invoices" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "supplier_id" varchar(40) NOT NULL,
        "invoice_type" character varying NOT NULL DEFAULT 'A',
        "supplier_invoice_number" character varying NOT NULL,
        "sales_point" character varying,
        "issue_date" date NOT NULL,
        "reception_date" date,
        "due_date" date,
        "currency" character varying NOT NULL DEFAULT 'ARS',
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "taxes" numeric(12,2) NOT NULL DEFAULT 0,
        "perceptions" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'draft',
        "cae" character varying,
        "cae_expiration" date,
        "purchase_order_id" varchar(40),
        "notes" text,
        CONSTRAINT "UQ_supplier_invoice_unique" UNIQUE ("supplier_id", "invoice_type", "sales_point", "supplier_invoice_number"),
        CONSTRAINT "PK_supplier_invoices" PRIMARY KEY ("id")
      )
    `);

    // supplier_invoice_items
    await queryRunner.query(`
      CREATE TABLE "supplier_invoice_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "supplier_invoice_id" varchar(40) NOT NULL,
        "product_id" varchar(40),
        "description" character varying NOT NULL,
        "quantity" numeric(12,2) NOT NULL,
        "unit_cost" numeric(12,2) NOT NULL,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL,
        "purchase_order_item_id" varchar(40),
        "reception_item_id" varchar(40),
        CONSTRAINT "PK_supplier_invoice_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "FK_supplier_invoice_items_inv"
      FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // three_way_matches
    await queryRunner.query(`
      CREATE TABLE "three_way_matches" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "purchase_order_id" varchar(40) NOT NULL,
        "supplier_delivery_note_id" varchar(40),
        "supplier_invoice_id" varchar(40) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "discrepancies" jsonb,
        "overridden_by" varchar(40),
        "overridden_at" TIMESTAMP,
        "notes" text,
        CONSTRAINT "PK_three_way_matches" PRIMARY KEY ("id")
      )
    `);

    // supplier_claims
    await queryRunner.query(`
      CREATE TABLE "supplier_claims" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "supplier_id" varchar(40) NOT NULL,
        "supplier_invoice_id" varchar(40),
        "purchase_order_id" varchar(40),
        "kind" character varying NOT NULL,
        "amount" numeric(12,2),
        "status" character varying NOT NULL DEFAULT 'open',
        "opened_by" varchar(40),
        "opened_at" TIMESTAMP NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMP,
        "notes" text,
        CONSTRAINT "PK_supplier_claims" PRIMARY KEY ("id")
      )
    `);

    // ALTER purchase_order_items
    await queryRunner.query(`
      ALTER TABLE "purchase_order_items"
      ADD COLUMN "received_qty" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN "invoiced_qty" numeric(12,2) NOT NULL DEFAULT 0
    `);

    // ALTER purchase_receptions
    await queryRunner.query(`
      ALTER TABLE "purchase_receptions"
      ADD COLUMN "supplier_delivery_note_id" varchar(40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_receptions" DROP COLUMN "supplier_delivery_note_id"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN "invoiced_qty"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN "received_qty"`);
    await queryRunner.query(`DROP TABLE "supplier_claims"`);
    await queryRunner.query(`DROP TABLE "three_way_matches"`);
    await queryRunner.query(`DROP TABLE "supplier_invoice_items"`);
    await queryRunner.query(`DROP TABLE "supplier_invoices"`);
    await queryRunner.query(`DROP TABLE "supplier_delivery_notes"`);
  }
}
