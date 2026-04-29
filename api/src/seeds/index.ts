import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedAdmin } from './admin.seed';
import { seedSupportAgent } from './support-agent.seed';
import { seedAdminAgent } from './admin-agent.seed';
import { seedCompany } from './company.seed';
import { seedMasterData } from './master-data.seed';
import { seedDemoData } from './demo-data.seed';
import { cleanupDemo } from './cleanup-demo.seed';
import { seedLargeDemo } from './large-demo.seed';
import { seedCatalogoproDemo } from './catalogopro-demo.seed';

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    await seedPermissions();
    console.log('Permissions seeded');

    await seedRoles();
    console.log('Roles seeded');

    await seedAdmin();
    console.log('Admin user seeded');

    await seedSupportAgent();
    console.log('Support agent user seeded');

    await seedAdminAgent();
    console.log('Admin agent user seeded');

    await seedCompany();
    console.log('Company seeded');

    await seedMasterData();
    console.log('Master data seeded');

    if (env.SEED_CATALOGOPRO_DEMO && env.SEED_LARGE_DEMO) {
      console.log('Full demo requested — cleaning up, then real catalog + transactional data...');
      await cleanupDemo();
      await seedCatalogoproDemo();
      console.log('Catalogopro demo catalog seeded');
      process.env.SEED_LARGE_DEMO_SKIP_PRODUCTS = 'true';
      await seedLargeDemo();
      console.log('Large demo data seeded (using real catalog products)');
    } else if (env.SEED_CATALOGOPRO_DEMO) {
      await seedCatalogoproDemo();
      console.log('Catalogopro demo catalog seeded');
    } else if (env.SEED_LARGE_DEMO) {
      console.log('Large demo requested — cleaning up existing demo data first...');
      await cleanupDemo();
      await seedLargeDemo();
      console.log('Large demo data seeded');
    } else if (env.SEED_DEMO_DATA) {
      await seedDemoData();
      console.log('Demo data seeded');
    }

    console.log('All seeds completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

runSeeds();
