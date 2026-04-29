import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1CommercialFoundations1776280000000 implements MigrationInterface {
  name = 'Phase1CommercialFoundations1776280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // sales_zones
    await queryRunner.query(`
      CREATE TABLE "sales_zones" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "parent_zone_id" varchar(40),
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_sales_zones_code" UNIQUE ("code"),
        CONSTRAINT "PK_sales_zones" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sales_zones" ADD CONSTRAINT "FK_sales_zones_parent"
      FOREIGN KEY ("parent_zone_id") REFERENCES "sales_zones"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // routes
    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "zone_id" varchar(40),
        "default_seller_id" varchar(40),
        "default_driver_id" varchar(40),
        "frequency" character varying NOT NULL DEFAULT 'weekly',
        "weekdays" jsonb,
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_routes_code" UNIQUE ("code"),
        CONSTRAINT "PK_routes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "routes" ADD CONSTRAINT "FK_routes_zone"
      FOREIGN KEY ("zone_id") REFERENCES "sales_zones"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // route_visits
    await queryRunner.query(`
      CREATE TABLE "route_visits" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "route_id" varchar(40) NOT NULL,
        "customer_id" varchar(40) NOT NULL,
        "sequence" integer NOT NULL DEFAULT 0,
        "visit_window" character varying,
        CONSTRAINT "PK_route_visits" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "route_visits" ADD CONSTRAINT "FK_route_visits_route"
      FOREIGN KEY ("route_id") REFERENCES "routes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_route_visits_route" ON "route_visits" ("route_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_route_visits_customer" ON "route_visits" ("customer_id")
    `);

    // customer_visits (log, not plan)
    await queryRunner.query(`
      CREATE TABLE "customer_visits" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "customer_id" varchar(40) NOT NULL,
        "route_id" varchar(40),
        "seller_id" varchar(40),
        "visited_at" TIMESTAMP NOT NULL DEFAULT now(),
        "result" character varying NOT NULL DEFAULT 'no_order',
        "order_id" varchar(40),
        "notes" text,
        "lat" numeric(9,6),
        "lng" numeric(9,6),
        CONSTRAINT "PK_customer_visits" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_visits_customer" ON "customer_visits" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_visits_route" ON "customer_visits" ("route_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_visits_visited_at" ON "customer_visits" ("visited_at")
    `);

    // promotions
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "kind" character varying NOT NULL,
        "valid_from" date,
        "valid_to" date,
        "channel" character varying,
        "customer_category" character varying,
        "zone_id" varchar(40),
        "min_qty" integer NOT NULL DEFAULT 1,
        "priority" integer NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'draft',
        CONSTRAINT "UQ_promotions_code" UNIQUE ("code"),
        CONSTRAINT "PK_promotions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "promotions" ADD CONSTRAINT "FK_promotions_zone"
      FOREIGN KEY ("zone_id") REFERENCES "sales_zones"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // promotion_items
    await queryRunner.query(`
      CREATE TABLE "promotion_items" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "promotion_id" varchar(40) NOT NULL,
        "product_id" varchar(40),
        "category_id" varchar(40),
        "discount_pct" numeric(5,2),
        "discount_amount" numeric(12,2),
        "buy_qty" integer,
        "get_qty" integer,
        "override_price" numeric(12,2),
        CONSTRAINT "PK_promotion_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "promotion_items" ADD CONSTRAINT "FK_promotion_items_promotion"
      FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // commissions
    await queryRunner.query(`
      CREATE TABLE "commissions" (
        "id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "metadata" jsonb,
        "seller_id" varchar(40) NOT NULL,
        "order_id" varchar(40) NOT NULL,
        "invoice_id" varchar(40),
        "base_amount" numeric(12,2) NOT NULL DEFAULT '0',
        "rate" numeric(5,2) NOT NULL DEFAULT '0',
        "amount" numeric(12,2) NOT NULL DEFAULT '0',
        "status" character varying NOT NULL DEFAULT 'accrued',
        "accrued_at" TIMESTAMP NOT NULL DEFAULT now(),
        "paid_at" TIMESTAMP,
        "payment_id" varchar(40),
        CONSTRAINT "PK_commissions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_commissions_seller" ON "commissions" ("seller_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_commissions_order" ON "commissions" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_commissions_status" ON "commissions" ("status")
    `);

    // ALTER customers
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN "category" character varying,
      ADD COLUMN "zone_id" varchar(40),
      ADD COLUMN "route_id" varchar(40),
      ADD COLUMN "credit_policy" character varying NOT NULL DEFAULT 'normal',
      ADD COLUMN "block_on_overdue" boolean NOT NULL DEFAULT false,
      ADD COLUMN "overdue_days_threshold" integer NOT NULL DEFAULT 30
    `);
    await queryRunner.query(`
      ALTER TABLE "customers" ADD CONSTRAINT "FK_customers_zone"
      FOREIGN KEY ("zone_id") REFERENCES "sales_zones"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "customers" ADD CONSTRAINT "FK_customers_route"
      FOREIGN KEY ("route_id") REFERENCES "routes"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ALTER orders
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "zone_id" varchar(40),
      ADD COLUMN "route_id" varchar(40),
      ADD COLUMN "operation_type" character varying NOT NULL DEFAULT 'sale',
      ADD COLUMN "promotion_id" varchar(40)
    `);

    // ALTER price_lists
    await queryRunner.query(`
      ALTER TABLE "price_lists"
      ADD COLUMN "min_qty" integer NOT NULL DEFAULT 1,
      ADD COLUMN "channel" character varying,
      ADD COLUMN "customer_category" character varying,
      ADD COLUMN "zone_id" varchar(40)
    `);

    // ALTER price_list_items
    await queryRunner.query(`
      ALTER TABLE "price_list_items"
      ADD COLUMN "valid_from" date,
      ADD COLUMN "valid_to" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "price_list_items" DROP COLUMN "valid_to"`);
    await queryRunner.query(`ALTER TABLE "price_list_items" DROP COLUMN "valid_from"`);

    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "zone_id"`);
    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "customer_category"`);
    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "channel"`);
    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "min_qty"`);

    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "promotion_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "operation_type"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "route_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "zone_id"`);

    await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_customers_route"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_customers_zone"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "overdue_days_threshold"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "block_on_overdue"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "credit_policy"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "route_id"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "zone_id"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "category"`);

    await queryRunner.query(`DROP TABLE "commissions"`);
    await queryRunner.query(`DROP TABLE "promotion_items"`);
    await queryRunner.query(`DROP TABLE "promotions"`);
    await queryRunner.query(`DROP TABLE "customer_visits"`);
    await queryRunner.query(`DROP TABLE "route_visits"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TABLE "sales_zones"`);
  }
}
