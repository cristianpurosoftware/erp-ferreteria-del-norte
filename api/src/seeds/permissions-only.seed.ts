/**
 * Idempotent standalone script: inserts any missing rows in `permissions`
 * (based on `permissions.constants.ts`) and re-syncs the `admin` role so it
 * always carries every permission currently known to the codebase.
 *
 * Non-admin editable roles are NOT touched, so client customisations are
 * preserved. Use this after adding new permission groups to the constants
 * file without having to run the full `npm run seed` flow.
 */
import { AppDataSource } from '../config/data-source';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';

async function run() {
  await AppDataSource.initialize();
  try {
    console.log('[permissions-only] inserting missing permission rows…');
    await seedPermissions();
    console.log('[permissions-only] re-syncing admin role (non-admin roles untouched)…');
    await seedRoles();
    console.log('[permissions-only] done. Users must re-login for the new permissions to appear in their JWT.');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('[permissions-only] failed:', err);
  process.exit(1);
});
