import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchIndexes1776290000000 implements MigrationInterface {
  name = 'AddSearchIndexes1776290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // customers
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_legal_name_trgm" ON "customers" USING gin ("legal_name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_commercial_name_trgm" ON "customers" USING gin ("commercial_name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_tax_id_trgm" ON "customers" USING gin ("tax_id" gin_trgm_ops)`);

    // products
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_sku_trgm" ON "products" USING gin ("sku" gin_trgm_ops)`);

    // suppliers
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_suppliers_name_trgm" ON "suppliers" USING gin ("name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_suppliers_tax_id_trgm" ON "suppliers" USING gin ("tax_id" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_suppliers_email_trgm" ON "suppliers" USING gin ("email" gin_trgm_ops)`);

    // users
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_first_name_trgm" ON "users" USING gin ("first_name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_last_name_trgm" ON "users" USING gin ("last_name" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_email_trgm" ON "users" USING gin ("email" gin_trgm_ops)`);

    // invoices (varchar number)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_invoices_number_trgm" ON "invoices" USING gin ("number" gin_trgm_ops)`);

    // supplier invoices (varchar supplier_invoice_number)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_supplier_invoices_snumber_trgm" ON "supplier_invoices" USING gin ("supplier_invoice_number" gin_trgm_ops)`);

    // integer "number" columns — btree for exact/prefix match
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_number" ON "orders" ("number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_shipments_number" ON "shipments" ("number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_supplier_invoices_number" ON "supplier_invoices" ("number")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_supplier_invoices_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shipments_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_supplier_invoices_snumber_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_number_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_last_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_first_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_suppliers_email_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_suppliers_tax_id_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_suppliers_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_sku_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customers_tax_id_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customers_commercial_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customers_legal_name_trgm"`);
    // pg_trgm extension left in place on purpose — may be used by other features
  }
}
