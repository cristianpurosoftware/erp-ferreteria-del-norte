import 'reflect-metadata';
import { AppDataSource } from '../../../src/config/data-source';

let initialized = false;

/** Initializes the singleton AppDataSource once against the testcontainer. */
export async function initDb() {
  if (initialized) return AppDataSource;
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  }
  initialized = true;
  return AppDataSource;
}

/** Truncates every user table to give each test a clean slate. Faster than
 *  running migrations down/up between tests. */
export async function resetDb() {
  const ds = await initDb();
  const rows = await ds.query<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'typeorm_%' AND tablename NOT LIKE 'migrations'`,
  );
  if (rows.length === 0) return;
  const names = rows.map((r) => `"${r.tablename}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

/** Runs a query — convenience wrapper so tests don't repeat AppDataSource.query. */
export async function q<T = any>(sql: string, params: any[] = []): Promise<T> {
  const ds = await initDb();
  return ds.query(sql, params) as Promise<T>;
}
