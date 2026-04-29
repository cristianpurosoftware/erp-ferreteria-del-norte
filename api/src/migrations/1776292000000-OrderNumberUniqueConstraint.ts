import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderNumberUniqueConstraint1776292000000 implements MigrationInterface {
  name = 'OrderNumberUniqueConstraint1776292000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Validate no duplicates exist before adding unique constraint
    const dupes: { number: number; count: string }[] = await queryRunner.query(`
      SELECT number, COUNT(*) AS count
      FROM orders
      WHERE deleted_at IS NULL
      GROUP BY number
      HAVING COUNT(*) > 1
    `);
    if (dupes.length > 0) {
      throw new Error(
        `No se puede agregar restricción UNIQUE: existen números de pedido duplicados: ${dupes.map((d) => d.number).join(', ')}`
      );
    }

    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_number" UNIQUE ("number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_orders_number"
    `);
  }
}
