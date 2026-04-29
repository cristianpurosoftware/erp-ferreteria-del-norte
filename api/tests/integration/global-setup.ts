import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

export async function setup() {
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('erp_test')
    .withUsername('erp_test')
    .withPassword('erp_test')
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  // Keep secrets harmless but non-default so assertProductionSecrets stays silent
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh';

  // Persist the container ref on globalThis so teardown can stop it
  (globalThis as any).__PG_CONTAINER__ = container;
}

export async function teardown() {
  const c: StartedPostgreSqlContainer | null = (globalThis as any).__PG_CONTAINER__;
  if (c) {
    try {
      await c.stop();
    } catch {
      // best-effort
    }
  }
}
