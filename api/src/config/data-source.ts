import { DataSource } from 'typeorm';
import { env } from './env';
import path from 'path';
import { AuditSubscriber } from '../modules/audit/audit.subscriber';
import { entityClasses } from '../entities.generated';

const isCompiled = path.extname(__filename) === '.js';

const sslForUrl = (url?: string) => {
  if (!url) return false;
  if (env.DB_SSL) return { rejectUnauthorized: false };
  if (/sslmode=(require|verify-ca|verify-full)/i.test(url)) return { rejectUnauthorized: false };
  return false;
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(env.DATABASE_URL
    ? { url: env.DATABASE_URL, ssl: sslForUrl(env.DATABASE_URL) }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        username: env.DB_USER,
        password: env.DB_PASS,
        database: env.DB_NAME,
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      }),
  synchronize: false,
  logging: ['error', 'warn'],
  maxQueryExecutionTime: 1000,
  // Static class list (not a glob) so TypeORM never has to require() a .ts
  // file at runtime. Works uniformly under ts-node, tsc build, and vitest.
  // Regenerate with `npm run gen:entities` after adding a new entity.
  entities: entityClasses,
  migrations: [
    isCompiled
      ? path.join(__dirname, '..', 'migrations', '*.js')
      : path.join(__dirname, '..', 'migrations', '*.ts'),
  ],
  subscribers: [AuditSubscriber],
});
