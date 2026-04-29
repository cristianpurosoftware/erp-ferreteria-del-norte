import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `support_access` column to the roles table. Roles flagged with
 * `support_access = true`:
 *   - Get an automatic bypass for every HTTP GET endpoint (see
 *     `middlewares/permissions.ts`) — we intentionally DO NOT enumerate
 *     individual read permissions so that new GET endpoints added later
 *     do not require a seed update.
 *   - Are protected from deletion and modification (they also carry
 *     `is_system_role = true`).
 *   - Cannot be assigned to a human user — the `users.service`
 *     explicitly rejects role assignment when the target role has this
 *     flag set. The role is reserved for the automated support agent.
 */
export class AddRoleSupportAccess1776560000000 implements MigrationInterface {
  name = 'AddRoleSupportAccess1776560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "support_access" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "support_access"`);
  }
}
