import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnaccentExtension1776570000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally a no-op: dropping unaccent could break other uses.
  }
}
