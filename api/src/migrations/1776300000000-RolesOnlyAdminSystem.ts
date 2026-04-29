import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Narrows the `roles.is_system_role` flag to just `admin`.
 *
 * Before this migration, the roles seed marked every base role as a system
 * role, which blocked editing and deletion in the UI. Product decision: only
 * `admin` is a system role; `gerencia`, `ventas`, `operaciones`,
 * `administracion`, `auditor` are editable templates.
 *
 * The statement is idempotent — running it twice produces the same state.
 */
export class RolesOnlyAdminSystem1776300000000 implements MigrationInterface {
  name = 'RolesOnlyAdminSystem1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET is_system_role = (name = 'admin')
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: mark the original 6 base roles as system, matching
    // the pre-migration state. Custom roles keep their current flag.
    await queryRunner.query(`
      UPDATE roles
      SET is_system_role = true
      WHERE deleted_at IS NULL
        AND name IN ('admin','gerencia','ventas','operaciones','administracion','auditor')
    `);
  }
}
