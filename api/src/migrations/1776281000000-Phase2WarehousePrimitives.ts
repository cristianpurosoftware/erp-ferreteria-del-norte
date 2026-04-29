import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2WarehousePrimitives1776281000000 implements MigrationInterface {
  name = 'Phase2WarehousePrimitives1776281000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // warehouse_locations
    await queryRunner.query(`
      CREATE TABLE "warehouse_locations" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "warehouse_id" varchar(40) NOT NULL,
        "code" character varying NOT NULL,
        "aisle" character varying,
        "rack" character varying,
        "shelf" character varying,
        "bin" character varying,
        "kind" character varying NOT NULL DEFAULT 'pick',
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_warehouse_locations_wh_code" UNIQUE ("warehouse_id", "code"),
        CONSTRAINT "PK_warehouse_locations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_warehouse_locations_warehouse" ON "warehouse_locations" ("warehouse_id")
    `);

    // lots
    await queryRunner.query(`
      CREATE TABLE "lots" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "product_id" varchar(40) NOT NULL,
        "code" character varying NOT NULL,
        "manufacture_date" date,
        "expiration_date" date,
        "supplier_id" varchar(40),
        "received_at" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_lots_product_code" UNIQUE ("product_id", "code"),
        CONSTRAINT "PK_lots" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_lots_product" ON "lots" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_lots_expiration_active" ON "lots" ("expiration_date") WHERE "status" = 'active'
    `);

    // stock_by_lot
    await queryRunner.query(`
      CREATE TABLE "stock_by_lot" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "product_id" varchar(40) NOT NULL,
        "lot_id" varchar(40) NOT NULL,
        "warehouse_id" varchar(40) NOT NULL,
        "location_id" varchar(40),
        "qty" numeric(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_stock_by_lot_tuple" UNIQUE ("product_id", "lot_id", "warehouse_id", "location_id"),
        CONSTRAINT "PK_stock_by_lot" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stock_by_lot_wh" ON "stock_by_lot" ("warehouse_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_by_lot" ADD CONSTRAINT "FK_stock_by_lot_lot"
      FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ALTER products
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "tracks_lot" boolean NOT NULL DEFAULT false,
      ADD COLUMN "tracks_serial" boolean NOT NULL DEFAULT false,
      ADD COLUMN "shelf_life_days" integer,
      ADD COLUMN "reorder_point" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN "lead_time_days" integer NOT NULL DEFAULT 0,
      ADD COLUMN "preferred_supplier_id" varchar(40)
    `);

    // ALTER stock_movements
    await queryRunner.query(`
      ALTER TABLE "stock_movements"
      ADD COLUMN "lot_id" varchar(40),
      ADD COLUMN "source_location_id" varchar(40),
      ADD COLUMN "dest_location_id" varchar(40),
      ADD COLUMN "reason_code" character varying
    `);

    // ALTER stock_reservations
    await queryRunner.query(`
      ALTER TABLE "stock_reservations"
      ADD COLUMN "lot_id" varchar(40),
      ADD COLUMN "location_id" varchar(40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP COLUMN "location_id"`);
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP COLUMN "lot_id"`);

    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "reason_code"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "dest_location_id"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "source_location_id"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "lot_id"`);

    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "preferred_supplier_id"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "lead_time_days"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "reorder_point"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "shelf_life_days"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "tracks_serial"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "tracks_lot"`);

    await queryRunner.query(`DROP TABLE "stock_by_lot"`);
    await queryRunner.query(`DROP TABLE "lots"`);
    await queryRunner.query(`DROP TABLE "warehouse_locations"`);
  }
}
