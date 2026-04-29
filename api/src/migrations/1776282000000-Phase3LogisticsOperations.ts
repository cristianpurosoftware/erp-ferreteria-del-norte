import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3LogisticsOperations1776282000000 implements MigrationInterface {
  name = 'Phase3LogisticsOperations1776282000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // vehicles
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "plate" character varying NOT NULL,
        "model" character varying,
        "capacity_kg" numeric(10,2),
        "capacity_m3" numeric(10,2),
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_vehicles_plate" UNIQUE ("plate"),
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id")
      )
    `);

    // drivers
    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "user_id" varchar(40),
        "full_name" character varying NOT NULL,
        "dni" character varying,
        "license_number" character varying,
        "license_expires" date,
        "phone" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_drivers" PRIMARY KEY ("id")
      )
    `);

    // dispatch_sheets
    await queryRunner.query(`
      CREATE TABLE "dispatch_sheets" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "date" date NOT NULL,
        "vehicle_id" varchar(40),
        "driver_id" varchar(40),
        "warehouse_id" varchar(40),
        "status" character varying NOT NULL DEFAULT 'draft',
        "notes" text,
        CONSTRAINT "PK_dispatch_sheets" PRIMARY KEY ("id")
      )
    `);

    // shipments
    await queryRunner.query(`
      CREATE TABLE "shipments" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "warehouse_id" varchar(40) NOT NULL,
        "vehicle_id" varchar(40),
        "driver_id" varchar(40),
        "dispatch_sheet_id" varchar(40),
        "planned_date" date NOT NULL,
        "departed_at" TIMESTAMP,
        "returned_at" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'planned',
        "total_stops" integer NOT NULL DEFAULT 0,
        "total_weight_kg" numeric(10,2),
        CONSTRAINT "PK_shipments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_dispatch_sheet"
      FOREIGN KEY ("dispatch_sheet_id") REFERENCES "dispatch_sheets"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // shipment_stops
    await queryRunner.query(`
      CREATE TABLE "shipment_stops" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "shipment_id" varchar(40) NOT NULL,
        "sequence" integer NOT NULL DEFAULT 0,
        "order_id" varchar(40) NOT NULL,
        "customer_id" varchar(40) NOT NULL,
        "address_id" varchar(40),
        "planned_window" character varying,
        "arrived_at" TIMESTAMP,
        "departed_at" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'pending',
        "delivery_note_id" varchar(40),
        "signature_url" character varying,
        "notes" text,
        "lat" numeric(9,6),
        "lng" numeric(9,6),
        CONSTRAINT "PK_shipment_stops" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "shipment_stops" ADD CONSTRAINT "FK_shipment_stops_shipment"
      FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_shipment_stops_shipment" ON "shipment_stops" ("shipment_id")
    `);

    // picking_tasks
    await queryRunner.query(`
      CREATE TABLE "picking_tasks" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "order_id" varchar(40),
        "shipment_id" varchar(40),
        "warehouse_id" varchar(40) NOT NULL,
        "assigned_to" varchar(40),
        "status" character varying NOT NULL DEFAULT 'pending',
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "priority" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_picking_tasks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_picking_tasks_order" ON "picking_tasks" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_picking_tasks_shipment" ON "picking_tasks" ("shipment_id")
    `);

    // picking_task_items
    await queryRunner.query(`
      CREATE TABLE "picking_task_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "picking_task_id" varchar(40) NOT NULL,
        "order_item_id" varchar(40),
        "product_id" varchar(40) NOT NULL,
        "lot_id" varchar(40),
        "source_location_id" varchar(40),
        "requested_qty" numeric(12,2) NOT NULL,
        "picked_qty" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'pending',
        CONSTRAINT "PK_picking_task_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "picking_task_items" ADD CONSTRAINT "FK_picking_task_items_task"
      FOREIGN KEY ("picking_task_id") REFERENCES "picking_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // return_orders
    await queryRunner.query(`
      CREATE TABLE "return_orders" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "customer_id" varchar(40) NOT NULL,
        "shipment_id" varchar(40),
        "shipment_stop_id" varchar(40),
        "original_order_id" varchar(40),
        "kind" character varying NOT NULL DEFAULT 'commercial',
        "status" character varying NOT NULL DEFAULT 'draft',
        "received_at" TIMESTAMP,
        "warehouse_id" varchar(40),
        "notes" text,
        CONSTRAINT "PK_return_orders" PRIMARY KEY ("id")
      )
    `);

    // return_order_items
    await queryRunner.query(`
      CREATE TABLE "return_order_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "return_order_id" varchar(40) NOT NULL,
        "product_id" varchar(40) NOT NULL,
        "lot_id" varchar(40),
        "quantity" numeric(12,2) NOT NULL,
        "reason_code" character varying,
        "condition" character varying NOT NULL DEFAULT 'resellable',
        "dest_location_id" varchar(40),
        "credit_note_id" varchar(40),
        CONSTRAINT "PK_return_order_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "return_order_items" ADD CONSTRAINT "FK_return_order_items_return"
      FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // inventory_counts
    await queryRunner.query(`
      CREATE TABLE "inventory_counts" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "number" SERIAL NOT NULL,
        "warehouse_id" varchar(40) NOT NULL,
        "kind" character varying NOT NULL DEFAULT 'cycle',
        "scope" jsonb,
        "status" character varying NOT NULL DEFAULT 'draft',
        "started_at" TIMESTAMP,
        "approved_by" varchar(40),
        "approved_at" TIMESTAMP,
        CONSTRAINT "PK_inventory_counts" PRIMARY KEY ("id")
      )
    `);

    // inventory_count_lines
    await queryRunner.query(`
      CREATE TABLE "inventory_count_lines" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "inventory_count_id" varchar(40) NOT NULL,
        "product_id" varchar(40) NOT NULL,
        "lot_id" varchar(40),
        "location_id" varchar(40),
        "system_qty" numeric(12,2) NOT NULL DEFAULT 0,
        "counted_qty" numeric(12,2),
        "difference" numeric(12,2),
        "reason_code" character varying,
        CONSTRAINT "PK_inventory_count_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "FK_inv_count_lines_count"
      FOREIGN KEY ("inventory_count_id") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ALTER orders
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "picking_status" character varying,
      ADD COLUMN "shipment_id" varchar(40)
    `);

    // ALTER stock_reservations
    await queryRunner.query(`
      ALTER TABLE "stock_reservations"
      ADD COLUMN "picking_task_item_id" varchar(40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP COLUMN "picking_task_item_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shipment_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "picking_status"`);

    await queryRunner.query(`DROP TABLE "inventory_count_lines"`);
    await queryRunner.query(`DROP TABLE "inventory_counts"`);
    await queryRunner.query(`DROP TABLE "return_order_items"`);
    await queryRunner.query(`DROP TABLE "return_orders"`);
    await queryRunner.query(`DROP TABLE "picking_task_items"`);
    await queryRunner.query(`DROP TABLE "picking_tasks"`);
    await queryRunner.query(`DROP TABLE "shipment_stops"`);
    await queryRunner.query(`DROP TABLE "shipments"`);
    await queryRunner.query(`DROP TABLE "dispatch_sheets"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
